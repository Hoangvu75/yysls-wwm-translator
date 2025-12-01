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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';

if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY is not set in environment variables');
  process.exit(1);
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
  spinner: any,
  inputFile: string,
  outputFile: string,
  retryCount: number = 0
): Promise<number> {
  const startTime = performance.now();

  if (!existsSync(inputFile)) {
    spinner.fail(`Input file ${inputFile} does not exist.`);
    return -1;
  }

  const contentToTranslate = await readFile(inputFile, 'utf-8');

  if (!contentToTranslate.trim()) {
    spinner.fail('Input file is empty.');
    return -1;
  }

  // Create output directory if it doesn't exist
  const outputDir = dirname(outputFile);
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  // Initialize Gemini AI
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  try {
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
      spinner.text = ` > ${chunkText.replace(/\n/g, '').trim().slice(0, 35)}...`;
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
    return (endTime - startTime) / 1000; // Convert to seconds
  } catch (error: any) {
    // Handle rate limit errors with exponential backoff
    if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('Too Many Requests')) {
      if (retryCount < 5) {
        const waitTime = Math.pow(2, retryCount) * 60 * 1000; // 1min, 2min, 4min, 8min, 16min
        spinner.warn(`Rate limit hit. Waiting ${waitTime / 60000} minutes before retry ${retryCount + 1}/5...`);
        await sleep(waitTime);
        spinner.start('Retrying translation...');
        return translateText(spinner, inputFile, outputFile, retryCount + 1);
      } else {
        spinner.fail(`Translation failed after 5 retries due to rate limits.`);
        return -1;
      }
    }
    
    spinner.fail(`Translation error: ${error.message}`);
    return -1;
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

  const spinner = ora('Processing').start();

  try {
    const files = await readdir(missingFolder);

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

    for (let idx = 0; idx < files.length; idx++) {
      const filename = files[idx];
      if (!filename.endsWith('.json')) {
        continue;
      }

      const newFilename = replaceFilenamePattern(filename, runAt);

      const inputFile = join(missingFolder, filename);
      const outputFile = newFilename === filename
        ? join(outputFolder, `t${runAt}_${filename}`)
        : join(outputFolder, newFilename);

      spinner.info(`[${idx + 1}/${files.length}] Translating ${filename}`);
      spinner.start('Waiting for response...');

      const processedTime = await translateText(spinner, inputFile, outputFile);

      if (processedTime >= 0) {
        const msg = `[${idx + 1}/${files.length}] Translation completed in ${processedTime.toFixed(2)} seconds.`;
        spinner.info(msg);
        
        // Add 4-second delay between requests to avoid rate limit (15 requests/min = 1 request per 4 seconds)
        if (idx < files.length - 1) {
          spinner.info('Waiting 4 seconds before next translation to avoid rate limit...');
          await sleep(4000);
        }
      } else {
        // If translation failed, wait longer before continuing
        spinner.warn('Translation failed. Waiting 10 seconds before continuing...');
        await sleep(10000);
      }
    }

    spinner.succeed('All translations completed!');
  } catch (error: any) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();

