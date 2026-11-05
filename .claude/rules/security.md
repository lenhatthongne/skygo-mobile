# Bảo mật

- Không đưa mật khẩu, OTP, JWT, khóa SMTP hay dữ liệu nhạy cảm vào mã nguồn, tài liệu, log hay ảnh chụp màn hình.
- Không dùng giá trị trong `.env` của project khác làm hằng số trong mobile. `EXPO_PUBLIC_*` có thể lộ trong bản ứng dụng, chỉ dùng cho cấu hình không bí mật như base URL.
- Không `console.log` body request/response có token, mật khẩu hoặc OTP.
- Token lưu bằng secure store, xóa khi đăng xuất hoặc khi nhận 401.
- Chỉ gọi HTTPS ở bản phát hành. Backend demo hiện bind `127.0.0.1`, thiết bị thật trên LAN không truy cập được nếu chưa cấu hình lại có chủ đích.
