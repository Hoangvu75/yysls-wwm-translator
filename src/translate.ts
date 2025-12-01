import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';
import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import ora from 'ora';

config();

const SYSTEM_DESCRIPTION = `You are a translator of the game Where Winds Meets. You master Chinese and Vietnamese languages.
Translate the following Chinese text to Vietnamese accurately, not missing any Chinese word, maintaining the game's tone and context.
Just response as json, do not add any extra explanation like \`\`\``;

// Load all available API keys
const API_KEYS: string[] = [];
for (let i = 1; i <= 10; i++) {
  const key = process.env[i === 1 ? 'GEMINI_API_KEY' : `GEMINI_API_KEY_${i}`];
  if (key && key.trim()) {
    API_KEYS.push(key.trim());
  }
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const PARALLEL_WORKERS = parseInt(process.env.PARALLEL_WORKERS || String(API_KEYS.length)) || 1;

if (API_KEYS.length === 0) {
  console.error('Error: No GEMINI_API_KEY found in environment variables');
  process.exit(1);
}

console.log(`✓ Loaded ${API_KEYS.length} API key(s)`);
console.log(`✓ Parallel workers: ${PARALLEL_WORKERS}`);

// Key rotation index
let currentKeyIndex = 0;

function getNextApiKey(): string {
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return key;
}

function replaceFilenamePattern(filename: string, outPrefix: string): string {
  const pattern = /^(.+?)_(\d+)\.json$/;
  const match = filename.match(pattern);

  if (match) {
    const number = match[2];
    return `p${outPrefix}_${number}.json`;
  }

  return filename;
}

// Sleep function for rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function translateText(
  inputFile: string,
  outputFile: string,
  apiKey: string,
  retryCount: number = 0
): Promise<{ success: boolean; time: number }> {
  const startTime = performance.now();

  try {
    if (!existsSync(inputFile)) {
      return { success: false, time: 0 };
    }

    const contentToTranslate = await readFile(inputFile, 'utf-8');

    if (!contentToTranslate.trim()) {
      return { success: false, time: 0 };
    }

    // Create output directory if it doesn't exist
    const outputDir = dirname(outputFile);
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Initialize Gemini AI with provided key
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_DESCRIPTION }],
        },
        {
          role: 'model',
          parts: [{ text: 'Understood. I will translate Chinese text to Vietnamese accurately in JSON format.' }],
        },
      ],
    });

    const result = await chat.sendMessageStream(contentToTranslate);

    let translatedText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      translatedText += chunkText;
    }

    // Extract JSON from response
    translatedText = translatedText.trim();
    const i1 = translatedText.indexOf('{');
    const i2 = translatedText.lastIndexOf('}');
    
    if (i1 !== -1 && i2 !== -1) {
      translatedText = translatedText.slice(i1, i2 + 1);
    }

    await writeFile(outputFile, translatedText, 'utf-8');

    const endTime = performance.now();
    return { success: true, time: (endTime - startTime) / 1000 };
  } catch (error: any) {
    // Handle rate limit errors with exponential backoff
    if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('Too Many Requests')) {
      if (retryCount < 3) {
        const waitTime = Math.pow(2, retryCount) * 30 * 1000; // 30s, 60s, 120s
        await sleep(waitTime);
        // Try with different API key if available
        const newKey = API_KEYS.length > 1 ? getNextApiKey() : apiKey;
        return translateText(inputFile, outputFile, newKey, retryCount + 1);
      }
    }
    
    return { success: false, time: 0 };
  }
}

// Worker function for parallel processing
async function worker(
  workerId: number,
  files: string[],
  missingFolder: string,
  outputFolder: string,
  runAt: string,
  apiKey: string,
  progressCallback: (workerId: number, filename: string, success: boolean, time: number) => void
) {
  for (const filename of files) {
    if (!filename.endsWith('.json')) {
      continue;
    }

    const newFilename = replaceFilenamePattern(filename, runAt);
    const inputFile = join(missingFolder, filename);
    const outputFile = newFilename === filename
      ? join(outputFolder, `t${runAt}_${filename}`)
      : join(outputFolder, newFilename);

    // Skip if already translated
    if (existsSync(outputFile)) {
      progressCallback(workerId, filename, true, 0);
      continue;
    }

    const result = await translateText(inputFile, outputFile, apiKey);
    progressCallback(workerId, filename, result.success, result.time);

    if (result.success) {
      // Add small delay to avoid rate limit
      await sleep(2000);
    } else {
      // Wait longer on failure
      await sleep(5000);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.log('Usage: npm run translate <source_folder> <output_folder>');
    console.log('Or: tsx src/translate.ts <source_folder> <output_folder>');
    process.exit(1);
  }

  const [missingFolder, outputFolder] = args;

  if (!existsSync(missingFolder)) {
    console.error(`Error: Source folder ${missingFolder} does not exist`);
    process.exit(1);
  }

  const spinner = ora('Loading files...').start();

  try {
    const files = await readdir(missingFolder);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    if (jsonFiles.length === 0) {
      spinner.succeed('No JSON files to translate');
      return;
    }

    const now = new Date();
    // Calculate ISO week number (same as Python's %V)
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    
    const runAt = 
      now.getFullYear().toString().slice(-2) +
      String(weekNum).padStart(2, '0') +
      now.getDay() +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0');

    spinner.succeed(`Found ${jsonFiles.length} files to translate`);

    // Divide files among workers
    const workers = Math.min(PARALLEL_WORKERS, API_KEYS.length, jsonFiles.length);
    const filesPerWorker = Math.ceil(jsonFiles.length / workers);
    
    console.log(`\n🚀 Starting ${workers} parallel workers...\n`);

    let completed = 0;
    let failed = 0;
    let totalTime = 0;

    const progressCallback = (workerId: number, filename: string, success: boolean, time: number) => {
      if (success) {
        completed++;
        totalTime += time;
        const avg = completed > 0 ? totalTime / completed : 0;
        const remaining = jsonFiles.length - completed - failed;
        const eta = remaining * avg;
        console.log(`✓ [Worker ${workerId}] [${completed + failed}/${jsonFiles.length}] ${filename} (${time.toFixed(1)}s) - ETA: ${(eta / 60).toFixed(1)}min`);
      } else {
        failed++;
        console.log(`✗ [Worker ${workerId}] [${completed + failed}/${jsonFiles.length}] ${filename} FAILED`);
      }
    };

    // Create worker promises
    const workerPromises = [];
    for (let i = 0; i < workers; i++) {
      const start = i * filesPerWorker;
      const end = Math.min(start + filesPerWorker, jsonFiles.length);
      const workerFiles = jsonFiles.slice(start, end);
      const apiKey = API_KEYS[i % API_KEYS.length];
      
      workerPromises.push(
        worker(i + 1, workerFiles, missingFolder, outputFolder, runAt, apiKey, progressCallback)
      );
    }

    // Wait for all workers to complete
    await Promise.all(workerPromises);

    console.log(`\n✅ Translation completed!`);
    console.log(`   Success: ${completed}/${jsonFiles.length}`);
    console.log(`   Failed: ${failed}/${jsonFiles.length}`);
    console.log(`   Average time: ${(totalTime / completed).toFixed(2)}s per file`);
    console.log(`   Total time: ${(totalTime / 60).toFixed(1)} minutes`);
  } catch (error: any) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
