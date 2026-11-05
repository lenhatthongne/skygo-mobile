# Kiểm chứng và bàn giao

- Sau thay đổi code, chạy `npx expo lint` và `npx tsc --noEmit`; cả hai phải đạt. Dùng `npx expo-doctor` khi đụng tới phụ thuộc hoặc cấu hình.
- Thêm thư viện bằng `npx expo install <gói>`. Không tự đổi package manager hay nâng phiên bản ngoài yêu cầu.
- Kiểm tra luồng trên iOS Simulator và Android Emulator (hoặc thiết bị thật); web chỉ là phụ, không bắt buộc. Backend chạy trên máy: Android emulator gọi `10.0.2.2`, iOS Simulator gọi `localhost`. Bản build gửi người khác trỏ `https://skygo-backend.onrender.com/api` (xem mục Triển khai và build trong `Demo/CLAUDE.md`). Emulator có sẵn: AVD `thongdemo-Pixel_8`.
- Kiểm tra luồng trên simulator, emulator hoặc thiết bị phù hợp với tính năng. Đăng nhập → OTP → tìm chuyến → chọn hạng vé → báo giá → đặt chỗ → thanh toán → vé QR; kiểm các lỗi 401, `PRICE_CHANGED`, `HOLD_EXPIRED`, mất mạng.
- Thông báo (cần development build): thanh toán thành công nhận push và chạm mở đúng đơn; bật/tắt nhắc giờ bay trong Cài đặt; đăng xuất thì hết nhắc cục bộ và thiết bị không nhận push của tài khoản cũ.
- Chỉ ghi dữ liệu trên dữ liệu test đã được phép. Không gửi email thật khi chưa kiểm tra phạm vi.
- Không tự commit khi chưa được yêu cầu; khi commit dùng Conventional Commits.
- Báo cáo ngắn: file đã sửa, hành vi đã thử, kết quả và phần chưa kiểm chứng. Không khẳng định API hay thiết bị chạy được nếu chưa chạy thử.
