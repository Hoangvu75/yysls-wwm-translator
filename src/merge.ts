import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

interface TextData {
  [key: string]: any;
}

async function mergeTextFiles(
  baseDir: string,
  patchDir: string,
  saveMissing: boolean = false
): Promise<void> {
  const mergedData: TextData = {};

  const textDir = join(baseDir, 'text');
  const outputFile = join(baseDir, 'entries.json');

  if (!existsSync(textDir)) {
    console.error(`Error: Text directory ${textDir} does not exist`);
    process.exit(1);
  }

  if (!existsSync(patchDir)) {
    console.error(`Error: Patch directory ${patchDir} does not exist`);
    process.exit(1);
  }

  // Merge original data first
  const textFiles = await readdir(textDir);
  
  for (const filename of textFiles) {
    if (filename.endsWith('.json')) {
      const origFilepath = join(textDir, filename);
      const content = await readFile(origFilepath, 'utf-8');
      const data = JSON.parse(content);
      Object.assign(mergedData, data);
    }
  }

  // Track all keys from base for missing detection
  const baseKeys = new Set(Object.keys(mergedData));
  const patchedKeys = new Set<string>();

  // Apply patches
  const patchFiles = await readdir(patchDir);

  for (const filename of patchFiles) {
    if (filename.endsWith('.json') && filename !== 'missing.json') {
      try {
        const patchFilepath = join(patchDir, filename);
        const content = await readFile(patchFilepath, 'utf-8');
        const patchData = JSON.parse(content);

        // Check if key exists in mergedData then update, else skip
        for (const [key, value] of Object.entries(patchData)) {
          patchedKeys.add(key);
          
          if (key in mergedData) {
            if (typeof value === 'string') {
              mergedData[key] = value;
            } else if (Array.isArray(value) && value.length > 0) {
              mergedData[key] = value[value.length - 1];
            } else if (typeof value === 'object' && value !== null) {
              const keys = Object.keys(value);
              if (keys.length > 0) {
                const lastKey = keys[keys.length - 1];
                mergedData[key] = (value as any)[lastKey];
              }
            }
          }
        }
      } catch (error: any) {
        console.error(`Error decoding JSON from ${filename}: ${error.message}`);
      }
    }
  }

  // Save original output file
  await writeFile(outputFile, JSON.stringify(mergedData, null, 2), 'utf-8');

  // Save missing keys if --miss flag is set
  if (saveMissing) {
    console.log(`Total base keys: ${baseKeys.size}`);
    console.log(`Total patched keys: ${patchedKeys.size}`);
    
    const missingDir = join(baseDir, 'missing');
    if (!existsSync(missingDir)) {
      await mkdir(missingDir, { recursive: true });
    }

    const missingKeys = Array.from(baseKeys).filter((key) => !patchedKeys.has(key));
    console.log(`Missing keys to translate: ${missingKeys.length}`);
    
    const missingData: TextData = {};
    
    for (const key of missingKeys) {
      missingData[key] = mergedData[key];
    }

    const entriesPerFile = 265;
    const missingCount = Math.ceil(missingKeys.length / entriesPerFile);

    // Convert to list for easier pagination
    const missingItems = Object.entries(missingData);

    // Create paginated files
    for (let page = 0; page < missingCount; page++) {
      const startIdx = page * entriesPerFile;
      const endIdx = startIdx + entriesPerFile;
      const pageData = Object.fromEntries(missingItems.slice(startIdx, endIdx));

      const missingFile = join(
        missingDir,
        `missing_${String(page + 1).padStart(5, '0')}.json`
      );
      await writeFile(missingFile, JSON.stringify(pageData, null, 2), 'utf-8');
    }

    console.log(`Saved ${missingKeys.length} missing entries to ${missingCount} files.`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npm run merge <base_dir> <patch_dir> [--miss]');
    console.log('Or: tsx src/merge.ts <base_dir> <patch_dir> [--miss]');
    process.exit(1);
  }

  const baseDir = args[0];
  const patchDir = args[1];
  const saveMissing = args.includes('--miss');

  try {
    await mergeTextFiles(baseDir, patchDir, saveMissing);
    console.log(`Merged text files ${patchDir} into ${baseDir}/entries.json`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();

