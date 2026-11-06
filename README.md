# SkyGo Mobile

Ứng dụng đặt vé máy bay SkyGo cho khách hàng (Android và iOS), viết bằng Expo và React Native với Expo Router.

Tính năng chính: đăng ký và đăng nhập bằng OTP, tìm chuyến, chọn hạng vé, đặt chỗ và chọn ghế, voucher, thanh toán
mô phỏng, vé QR dùng được khi không có mạng (lưu thành ảnh), bản đồ sân bay, trợ lý AI, chat hỗ trợ thời gian thực
có ảnh, thông báo và nhắc giờ bay, tiếng Việt và tiếng Anh.

## Chạy

```bash
npm install
npx expo start
```

Ứng dụng gọi backend `skygo-backend` (mặc định `https://skygo-backend.onrender.com/api`, đổi bằng
`EXPO_PUBLIC_API_URL`). Có mã native (bản đồ, camera, thông báo) nên cần development build, không chạy trong Expo Go.

## Cấu trúc

- `src/app/`: chỉ chứa màn hình, chia theo route group, mỗi group có `_layout.tsx` (`(auth)`, `(tabs)`, `(search)`,
  `(booking)`, `(trip)`, `(support)`, `(passengers)`, `(inbox)`, `(offers)`, `(assistant)`).
- `src/components/`: thành phần giao diện dùng lại, chia theo tính năng; `ui/` cho thành phần chung, `shell/` cho
  thanh tab và màn khởi động.
- `src/services/`: gọi API (một instance axios), thông báo, kết nối WebSocket, lưu ngoại tuyến.
- `src/hooks/`, `src/utils/`, `src/i18n/`, `src/types/`, `src/constants/`.

Quy tắc chi tiết nằm trong `.claude/rules/` và `AGENTS.md`.

## Kiểm tra

```bash
npx tsc --noEmit
npx expo lint
```

## Dựng APK Android

Xem mục "Triển khai và build" trong `../CLAUDE.md`. Thông báo đẩy cần `google-services.json` của Firebase đặt ở thư mục
này (không đưa lên Git); hướng dẫn trong `skygo-backend/docs/FIREBASE_PUSH.md`.
