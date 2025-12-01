# Script dịch local cho Windows PowerShell
# Sử dụng: .\translate-local.ps1

Write-Host "=== WWM Locale Translator - Local Mode ===" -ForegroundColor Green
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js not found! Please install Node.js >= 18.0.0" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green

# Check .env file
Write-Host "Checking .env file..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Creating .env from template..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "⚠️ Please edit .env file and add your GEMINI_API_KEY" -ForegroundColor Yellow
    notepad .env
    Write-Host "Press Enter after you've added your API key..." -ForegroundColor Yellow
    Read-Host
}
Write-Host "✓ .env file found" -ForegroundColor Green

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install --silent
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Create directories
Write-Host "Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "works/patch" | Out-Null
New-Item -ItemType Directory -Force -Path "works/translated" | Out-Null
New-Item -ItemType Directory -Force -Path "output/words_map" | Out-Null
Write-Host "✓ Directories created" -ForegroundColor Green

# Check if words_map exists
Write-Host ""
Write-Host "=== Step 1: Prepare words_map ===" -ForegroundColor Cyan
if (-not (Test-Path "output/words_map/text")) {
    Write-Host "⚠️ words_map not found!" -ForegroundColor Yellow
    Write-Host "Please:"
    Write-Host "  1. Download unpacked_words_map.zip from GitHub Release"
    Write-Host "  2. Extract to output/words_map/ folder"
    Write-Host "  3. Or place words_map file and run: .\bin\yanyun path\to\words_map"
    Write-Host ""
    Write-Host "Press Enter when ready..." -ForegroundColor Yellow
    Read-Host
}

if (-not (Test-Path "output/words_map/text")) {
    Write-Host "❌ Still no words_map found in output/words_map/text/" -ForegroundColor Red
    exit 1
}
Write-Host "✓ words_map found" -ForegroundColor Green

# Create missing files
Write-Host ""
Write-Host "=== Step 2: Create missing files ===" -ForegroundColor Cyan
Write-Host "Creating empty patch..." -ForegroundColor Yellow
"{}" | Out-File -FilePath "works/patch/empty.json" -Encoding utf8

Write-Host "Running merge to find missing entries..." -ForegroundColor Yellow
npx tsx src/merge.ts ./output/words_map ./works/patch --miss

if (-not (Test-Path "output/words_map/missing")) {
    Write-Host "❌ No missing files created!" -ForegroundColor Red
    exit 1
}

$missingCount = (Get-ChildItem "output/words_map/missing" -Filter "*.json").Count
Write-Host "✓ Found $missingCount missing files to translate" -ForegroundColor Green

# Translate
Write-Host ""
Write-Host "=== Step 3: Translate missing files ===" -ForegroundColor Cyan
Write-Host "Starting translation..." -ForegroundColor Yellow
Write-Host "This will take several hours. You can close this window and check back later." -ForegroundColor Yellow
Write-Host "Translated files will be saved to: works/translated/" -ForegroundColor Yellow
Write-Host ""

npx tsx src/translate.ts ./output/words_map/missing ./works/translated

Write-Host ""
Write-Host "=== Translation completed! ===" -ForegroundColor Green
Write-Host "Translated files are in: works/translated/" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Merge translated files: npx tsx src/merge.ts ./output/words_map ./works/translated"
Write-Host "  2. Pack with yanyun: .\bin\yanyun ./output/words_map"
Write-Host "  3. Result will be in: output/words_map/merged/words_map"

