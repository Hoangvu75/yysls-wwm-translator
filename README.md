# Where Winds Meet Locale Tool - Node.js/TypeScript

Công cụ hỗ trợ dịch thuật và quản lý file locale cho game [Where Winds Meet](https://wherewindsmeet.com), được viết bằng Node.js và TypeScript, sử dụng **Google Gemini AI** để dịch.

## ✨ Tính năng

- 🤖 **Dịch tự động**: Dịch file JSON từ tiếng Trung sang tiếng Việt bằng Gemini AI
- 📦 **Merge files**: Gộp file JSON gốc với file patch
- 🔍 **Phát hiện missing**: Tự động tìm và tạo file cho các entry chưa được dịch
- ⚡ **TypeScript**: Code type-safe và dễ bảo trì
- 🎯 **Streaming**: Hiển thị tiến độ dịch realtime
- 🚀 **GitHub Workflows**: Tự động hóa qua GitHub Actions

## 📋 Yêu cầu

- Node.js >= 18.0.0
- npm hoặc yarn
- Gemini API Key (miễn phí tại [Google AI Studio](https://aistudio.google.com/app/apikey))

## 🚀 Sử dụng

### Phương pháp 1: Sử dụng GitHub Workflows (Khuyến nghị)

1. **Fork repository này**
2. **Thêm Gemini API Key vào GitHub Secrets**:
   - Vào `Settings` → `Secrets and variables` → `Actions`
   - Tạo secret mới: `GEMINI_API_KEY` với giá trị API key của bạn

3. **Chạy workflows**:
   - Vào tab `Actions`
   - Chọn workflow phù hợp:
     - **Unpack words_map file**: Giải nén file words_map
     - **Translate missing entries**: Dịch các entry chưa có
     - **Pack words_map files**: Đóng gói file đã dịch

### Phương pháp 2: Chạy local

#### Cài đặt

```bash
# Clone repository
git clone <your-repo-url>
cd wwm-locale-nodejs

# Cài đặt dependencies
npm install

# Tạo file .env và thêm API key
cp env.example .env
# Sửa file .env và thêm GEMINI_API_KEY
```

#### Các lệnh

**1. Dịch file JSON:**

```bash
npm run translate <source_folder> <output_folder>

# Ví dụ:
npm run translate ./missing ./translated
```

**2. Merge file JSON:**

```bash
npm run merge <base_dir> <patch_dir> [--miss]

# Ví dụ:
# Merge không tạo missing files
npm run merge ./base ./translated

# Merge và tạo missing files
npm run merge ./base ./translated --miss
```

## 📁 Cấu trúc dự án

```
wwm-locale-nodejs/
├── .github/
│   └── workflows/
│       ├── unpack.yml      # Giải nén words_map
│       ├── translate.yml   # Dịch với Gemini AI
│       └── pack.yml        # Đóng gói locale
├── bin/
│   └── yanyun              # Binary tool
├── archive/
│   └── words_map_diff      # Diff file
├── src/
│   ├── translate.ts        # Script dịch
│   ├── merge.ts            # Script merge
│   └── index.ts            # Entry point
├── package.json
├── tsconfig.json
└── README.md
```

## 🔄 Quy trình làm việc

### Quy trình 1: Sử dụng GitHub Workflows

```
1. Fork repo
2. Thêm GEMINI_API_KEY vào Secrets
3. Chạy "Unpack words_map" workflow
   → Tải xuống unpacked_words_map.zip từ Releases
4. (Nếu có patches cũ) Chạy "Translate missing" với patches
   → Tải xuống translated.zip
5. Chạy "Pack words_map" với file translated
   → Tải xuống translate_words_map_vi.zip
6. Sử dụng file đã pack trong game
```

### Quy trình 2: Chạy local

```
1. Giải nén words_map → base/text/*.json
2. Merge và tìm missing → npm run merge base patches --miss
3. Dịch missing entries → npm run translate base/missing translated
4. Merge translated → npm run merge base translated
5. Đóng gói lại với yanyun
6. Lặp lại bước 2-5 cho đến khi hết missing
```

## 🌐 GitHub Workflows

### Unpack Workflow

Giải nén file `words_map` để lấy các file JSON gốc.

**Inputs:**
- `words_map`: URL download file words_map

**Outputs:**
- `unpacked_words_map.zip`: File chứa folder `text/` với các JSON files

### Translate Workflow

Dịch các entry chưa được dịch bằng Gemini AI.

**Inputs:**
- `words_map`: URL download file words_map gốc
- `words_map_patched`: (Optional) URL download file patches đã dịch trước đó

**Secrets:**
- `GEMINI_API_KEY`: Gemini API key (thêm vào GitHub Secrets)

**Outputs:**
- `translated.zip`: File chứa các entry đã dịch

### Pack Workflow

Đóng gói file đã dịch thành `translate_words_map_vi`.

**Inputs:**
- `words_map`: URL download file words_map gốc
- `words_map_patched`: URL download file patches đã dịch
- `output_filename`: Tên file output (default: `translate_words_map_vi`)

**Outputs:**
- `{output_filename}.zip`: File locale đã pack, sẵn sàng sử dụng

## 🎯 API và Model

Dự án sử dụng **Google Gemini AI**:

- **Model mặc định**: `gemini-2.0-flash-exp` (nhanh, miễn phí)
- **Model khác**: `gemini-1.5-pro`, `gemini-1.5-flash`

Thay đổi model trong file `.env`:

```env
GEMINI_MODEL=gemini-1.5-pro
```

## 💡 Tips

1. **Free Tier Limits**: Gemini Free có giới hạn 15 requests/phút, 1500 requests/ngày
2. **Batch Processing**: Nên dịch từng batch nhỏ (10-20 files) để tránh rate limit
3. **Kiểm tra chất lượng**: Luôn review một vài file sample trước khi dịch hàng loạt
4. **Backup**: Backup file gốc trước khi merge

## 🐛 Xử lý lỗi

### Rate Limit Error
- Chờ vài phút rồi chạy lại
- Dịch batch nhỏ hơn
- Nâng cấp lên paid plan

### API Key Error
- Kiểm tra API key đã đúng chưa
- Đảm bảo API key được enable

### File Not Found
- Kiểm tra đường dẫn folder
- Đảm bảo file words_map đúng format

## 📄 License

MIT

## 🙏 Credits

- Base tool by [dest1yo](https://github.com/dest1yo)
- Node.js/TypeScript version with Gemini AI
- Game: [Where Winds Meet](https://wherewindsmeet.com)

