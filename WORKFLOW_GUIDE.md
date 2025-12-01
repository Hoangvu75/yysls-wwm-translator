# 🚀 Hướng Dẫn Sử Dụng GitHub Workflows

## Chuẩn bị

### Bước 1: Fork Repository

1. Click nút **Fork** ở góc trên bên phải
2. Chọn account của bạn để fork

### Bước 2: Thêm Gemini API Key

1. Lấy API key miễn phí tại: https://aistudio.google.com/app/apikey
2. Vào repository đã fork
3. Click `Settings` → `Secrets and variables` → `Actions`
4. Click `New repository secret`
5. Nhập:
   - **Name**: `GEMINI_API_KEY`
   - **Secret**: Paste API key của bạn
6. Click `Add secret`

![Add Secret](https://docs.github.com/assets/cb-28517/mw-1440/images/help/actions/add-new-secret.webp)

## Workflows

### 1️⃣ Unpack words_map file

**Mục đích**: Giải nén file `words_map` từ game để lấy các file JSON gốc.

**Cách chạy**:

1. Vào tab **Actions**
2. Chọn workflow **"Unpack words_map file"**
3. Click **"Run workflow"**
4. Nhập:
   - `words_map`: URL download file words_map (từ game hoặc GitHub Release)
5. Click **"Run workflow"**

**Kết quả**:
- File `unpacked_words_map.zip` sẽ được tạo trong **Releases** (draft)
- Chứa folder `text/` với tất cả JSON files gốc

**Ví dụ URL**:
```
https://github.com/user/repo/releases/download/v1.0/words_map
```

---

### 2️⃣ Translate missing entries

**Mục đích**: Dịch các entry chưa được dịch bằng Gemini AI.

**Cách chạy**:

1. Vào tab **Actions**
2. Chọn workflow **"Translate missing entries"**
3. Click **"Run workflow"**
4. Nhập:
   - `words_map`: URL file words_map gốc
   - `words_map_patched` (optional): URL file patches đã dịch trước đó
5. Click **"Run workflow"**

**Kết quả**:
- File `translated.zip` trong **Releases** (draft)
- Chứa các file JSON đã dịch

**Lưu ý**:
- Workflow này sử dụng `GEMINI_API_KEY` từ Secrets
- Nếu không có patches cũ, để trống `words_map_patched` → sẽ dịch tất cả
- Nếu có patches, workflow sẽ chỉ dịch các entry chưa có

**Ví dụ**:

**Lần đầu tiên** (chưa có patches):
```
words_map: https://github.com/.../words_map
words_map_patched: (để trống)
```

**Lần 2** (đã có patches từ lần 1):
```
words_map: https://github.com/.../words_map
words_map_patched: https://github.com/.../translated.zip
```

---

### 3️⃣ Pack words_map files

**Mục đích**: Đóng gói các file đã dịch thành `translate_words_map_vi` để sử dụng trong game.

**Cách chạy**:

1. Vào tab **Actions**
2. Chọn workflow **"Pack words_map files"**
3. Click **"Run workflow"**
4. Nhập:
   - `words_map`: URL file words_map gốc
   - `words_map_patched`: URL file translated.zip (từ workflow 2)
   - `output_filename`: Tên file output (default: `translate_words_map_vi`)
5. Click **"Run workflow"**

**Kết quả**:
- File `translate_words_map_vi.zip` trong **Releases** (draft)
- Chứa:
  - `translate_words_map_vi`: File locale đã pack
  - `translate_words_map_vi_diff`: File diff

**Ví dụ**:
```
words_map: https://github.com/.../words_map
words_map_patched: https://github.com/.../translated.zip
output_filename: translate_words_map_vi
```

---

## 🔄 Quy Trình Hoàn Chỉnh

### Scenario 1: Dịch lần đầu tiên

```
1. Chạy "Unpack words_map file"
   Input: URL words_map từ game
   Output: unpacked_words_map.zip

2. Chạy "Translate missing entries"
   Input: 
   - words_map: URL từ game
   - words_map_patched: để trống
   Output: translated.zip (batch 1)

3. Chạy "Pack words_map files"
   Input:
   - words_map: URL từ game
   - words_map_patched: URL translated.zip từ bước 2
   Output: translate_words_map_vi.zip

4. Download và test trong game
```

### Scenario 2: Tiếp tục dịch (đã có patches)

```
1. Chạy "Translate missing entries"
   Input:
   - words_map: URL từ game
   - words_map_patched: URL translated.zip từ lần trước
   Output: translated.zip (batch 2)

2. Merge 2 translated.zip lại với nhau (local)
   hoặc chạy lại Pack với translated mới

3. Chạy "Pack words_map files"
   Input:
   - words_map: URL từ game
   - words_map_patched: URL translated.zip merged
   Output: translate_words_map_vi.zip

4. Download và test trong game
```

---

## 📊 Tips & Best Practices

### 1. Quản lý Releases

- Mỗi workflow tạo **Draft Release**
- Sau khi verify, publish release để dễ quản lý
- Đặt tên release rõ ràng: `v1.0-translated-batch1`, `v1.0-packed-final`

### 2. Xử lý Rate Limit

Gemini Free Tier:
- 15 requests/phút
- 1,500 requests/ngày

**Giải pháp**:
- Dịch từng batch nhỏ (workflow tự động chia)
- Nếu workflow fail do rate limit, chờ 5-10 phút rồi chạy lại
- Sử dụng patches từ lần trước để tránh dịch lại

### 3. Kiểm tra chất lượng

1. Download translated.zip
2. Giải nén và mở vài file JSON
3. Kiểm tra xem dịch có chính xác không
4. Nếu không tốt, thử thay đổi model trong code:
   - `gemini-2.0-flash-exp` (nhanh)
   - `gemini-1.5-pro` (chất lượng cao)

### 4. Backup

- Luôn giữ link đến Release gốc của words_map
- Backup các translated.zip sau mỗi lần chạy
- Có thể tạo branch riêng cho mỗi version game

---

## ⚠️ Troubleshooting

### Lỗi: "GEMINI_API_KEY is not set"

**Nguyên nhân**: Chưa thêm API key vào Secrets

**Giải pháp**:
1. Vào `Settings` → `Secrets and variables` → `Actions`
2. Thêm secret `GEMINI_API_KEY`

### Workflow bị fail ở bước translate

**Nguyên nhân**: Rate limit hoặc API key không hợp lệ

**Giải pháp**:
1. Kiểm tra API key còn valid không
2. Chờ 5-10 phút rồi chạy lại
3. Check logs trong workflow để xem chi tiết lỗi

### File packed không chạy trong game

**Nguyên nhân**: File bị corrupt hoặc format sai

**Giải pháp**:
1. Kiểm tra logs của Pack workflow
2. Verify file words_map gốc có đúng không
3. Thử unpack và repack lại

### Không thấy Release sau khi workflow chạy

**Nguyên nhân**: Release ở chế độ Draft

**Giải pháp**:
1. Vào tab **Releases**
2. Tìm draft release
3. Click **Edit** và **Publish release**

---

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Check logs trong workflow run
2. Tạo Issue trên GitHub
3. Tag với label `workflow` hoặc `translation`

---

Made with ❤️ for Where Winds Meet community

