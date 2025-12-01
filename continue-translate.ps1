# Script tiếp tục dịch từ file đã có - PowerShell version
# Sử dụng: .\continue-translate.ps1

Write-Host "=== Continue Translation with Existing Files ===" -ForegroundColor Green
Write-Host ""

# Check if patch folder has files
if (-not (Test-Path "works/patch")) {
    Write-Host "❌ works/patch folder not found!" -ForegroundColor Red
    Write-Host "Please copy your translated .json files to works/patch/ first"
    exit 1
}

$patchFiles = Get-ChildItem "works/patch" -Filter "*.json" -File
if ($patchFiles.Count -eq 0) {
    Write-Host "❌ No translated files found in works/patch/" -ForegroundColor Red
    Write-Host "Please copy your translated .json files to works/patch/ first"
    exit 1
}

Write-Host "✓ Found $($patchFiles.Count) translated files in works/patch/" -ForegroundColor Green

# Check words_map
if (-not (Test-Path "output/words_map/text")) {
    Write-Host "❌ words_map not found in output/words_map/text/" -ForegroundColor Red
    exit 1
}
Write-Host "✓ words_map found" -ForegroundColor Green

# Find missing entries
Write-Host ""
Write-Host "=== Step 1: Finding missing entries ===" -ForegroundColor Cyan
Write-Host "Running merge..." -ForegroundColor Yellow
npx tsx src/merge.ts ./output/words_map ./works/patch --miss

# Check if there are missing files
if (-not (Test-Path "output/words_map/missing")) {
    Write-Host "✓ No missing entries! All translations are complete!" -ForegroundColor Green
    Write-Host "Finalizing merge..." -ForegroundColor Yellow
    npx tsx src/merge.ts ./output/words_map ./works/patch
    Write-Host "✓ Done! Result in: output/words_map/entries.json" -ForegroundColor Green
    exit 0
}

$missingFiles = Get-ChildItem "output/words_map/missing" -Filter "*.json" -File -ErrorAction SilentlyContinue
if ($missingFiles.Count -eq 0) {
    Write-Host "✓ No missing entries! All translations are complete!" -ForegroundColor Green
    Write-Host "✓ Done! Result in: output/words_map/entries.json" -ForegroundColor Green
    exit 0
}

Write-Host "Found $($missingFiles.Count) missing files to translate" -ForegroundColor Yellow

# Translate missing
Write-Host ""
Write-Host "=== Step 2: Translating missing entries ===" -ForegroundColor Cyan
Write-Host "This will take several hours..." -ForegroundColor Yellow
Write-Host "Translated files will be saved to: works/translated/" -ForegroundColor Yellow
Write-Host ""

New-Item -ItemType Directory -Force -Path "works/translated" | Out-Null
npx tsx src/translate.ts ./output/words_map/missing ./works/translated

# Merge all
Write-Host ""
Write-Host "=== Step 3: Merging all translations ===" -ForegroundColor Cyan
npx tsx src/merge.ts ./output/words_map ./works/patch
npx tsx src/merge.ts ./output/words_map ./works/translated

Write-Host ""
Write-Host "=== Translation completed! ===" -ForegroundColor Green
Write-Host "✓ Original translations: works/patch/" -ForegroundColor Green
Write-Host "✓ New translations: works/translated/" -ForegroundColor Green
Write-Host "✓ Final result: output/words_map/entries.json" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Pack with yanyun: .\bin\yanyun .\output\words_map" -ForegroundColor Yellow
Write-Host "  2. Result will be in: output\words_map\merged\words_map" -ForegroundColor Yellow

