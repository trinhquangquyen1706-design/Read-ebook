# Dễ Đọc

Dễ Đọc là reader song ngữ giúp biến văn bản dài thành các đoạn có nhịp đọc thoáng và dễ tập trung hơn. Toàn bộ nội dung được xử lý ngay trong trình duyệt.

## Tính năng

- Làm sạch khoảng trắng và nối các dòng bị ngắt khi sao chép từ PDF.
- Tự chia đoạn theo câu và độ dài nội dung.
- Bố cục Một trang hoặc sách mở Hai trang có phân trang và điều hướng.
- Chế độ Tập trung làm mờ phần chưa đọc và hỗ trợ phím mũi tên.
- Dán văn bản dài mượt hơn nhờ tách ô nhập khỏi chu kỳ render của bản đọc.
- Hồ sơ Auto, Tiếng Việt và English.
- Font Lora, Source Serif 4, Be Vietnam Pro, Georgia và sans hệ thống.
- Điều chỉnh cỡ chữ, giãn dòng, chiều rộng cột và giao diện.
- Sao chép bản đọc và đọc thành tiếng theo từng đoạn, tự chọn giọng Việt hoặc Anh phù hợp.
- Lưu tùy chọn trên thiết bị bằng localStorage.

## Chạy trên máy

Yêu cầu Node.js 22 trở lên.

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

## Kiểm tra

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Công nghệ

- Next.js App Router
- React
- TypeScript
- Tailwind CSS 4 và CSS tùy chỉnh

## Quyền riêng tư

Văn bản người dùng không được gửi tới API hoặc lưu trên máy chủ. Chỉ các tùy chọn hiển thị được lưu trong trình duyệt.
