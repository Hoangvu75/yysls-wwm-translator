# 🏠 Hướng Dẫn Chạy Dịch Local

## Ưu điểm chạy local:
- ⚡ Không bị giới hạn 6 giờ như GitHub Actions
- 💻 Sử dụng tài nguyên máy tính của bạn
- 🔄 Có thể pause/resume bất cứ lúc nào
- 📊 Theo dõi tiến độ realtime

## Yêu cầu:
- Node.js >= 18.0.0
- Gemini API Key
- Đã có file words_map đã unpack

## Các bước:

### 1. Cài đặt dependencies

```bash
cd wwm-locale-nodejs
npm install
```

### 2. Tạo file .env với API key

```bash
# Tạo file .env
echo "GEMINI_API_KEY=your_api_key_here" > .env
echo "GEMINI_MODEL=gemini-1.5-flash" >> .env
```

Hoặc copy từ template:
```bash
cp env.example .env
# Sau đó edit file .env và điền API key
```

### 3. Chuẩn bị files cần dịch

**Option A: Download từ GitHub Release (từ workflow Unpack)**

```bash
# Download unpacked_words_map.zip
# Giải nén vào thư mục output/words_map/
```

**Option B: Unpack local nếu có file words_map**

```bash
chmod +x ./bin/yanyun
./bin/yanyun path/to/words_map
# Files sẽ được tạo trong output/words_map/text/
```

### 4. Tạo missing files

```bash
# Tạo folder patch rỗng
mkdir -p works/patch
echo "{}" > works/patch/empty.json

# Chạy merge để tạo missing files
npx tsx src/merge.ts ./output/words_map ./works/patch --miss
```

Bạn sẽ thấy:
```
Total base keys: 71744
Total patched keys: 0
Missing keys to translate: 71744
Saved 71744 missing entries to 271 files.
```

### 5. Dịch tất cả missing files

```bash
# Tạo folder output
mkdir -p works/translated

# Chạy dịch
npx tsx src/translate.ts ./output/words_map/missing ./works/translated
```

### 6. Theo dõi tiến độ

Bạn sẽ thấy output như:
```
[1/271] Translating missing_00001.json
- Waiting for response...
✓ [1/271] Translation completed in 45.23 seconds.
ℹ Waiting 4 seconds before next translation to avoid rate limit...

[2/271] Translating missing_00002.json
...
```

### 7. Nếu bị ngắt giữa chừng

Script tự động skip files đã dịch. Chỉ cần chạy lại lệnh:

```bash
npx tsx src/translate.ts ./output/words_map/missing ./works/translated
```

### 8. Sau khi dịch xong

Merge lại vào base:
```bash
npx tsx src/merge.ts ./output/words_map ./works/translated
```

File `entries.json` sẽ chứa tất cả text đã dịch!

## Tips:

### Chạy trong tmux/screen (Linux/Mac)
Để không bị mất tiến độ khi đóng terminal:

```bash
# Tạo session mới
tmux new -s translate

# Chạy script dịch
npx tsx src/translate.ts ./output/words_map/missing ./works/translated

# Detach: Ctrl+B, D
# Reattach: tmux attach -t translate
```

### Chạy trong PowerShell (Windows)

```powershell
# Chạy trong background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npx tsx src/translate.ts ./output/words_map/missing ./works/translated"
```

## Ước tính thời gian:

- 271 files × ~60 giây = ~4.5 giờ
- Với rate limit và retry: ~6-8 giờ
- Có thể chạy qua đêm

## Xử lý lỗi:

Nếu gặp lỗi, script sẽ:
1. Tự động retry với exponential backoff
2. Chờ khi gặp rate limit
3. Continue với file tiếp theo nếu fail

Chỉ cần để máy chạy và script sẽ tự xử lý! 🚀

