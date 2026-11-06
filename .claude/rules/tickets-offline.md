# Vé QR và ngoại tuyến

- `GET /bookings/{id}/ticket` trả `qrContent` (`SKYGO:<token>`), `valid`, `syncedAt`. Mã QR vẽ từ `qrContent`.
- Lưu bản sao tối thiểu để xem khi không có mạng: mã đặt chỗ, hành trình, `qrContent`, `valid`, `syncedAt`. Dùng kho phù hợp, không lưu mật khẩu hay token đăng nhập trong đó.
- Luôn hiển thị thời điểm đồng bộ. Khi có mạng, tải lại và cập nhật `valid`.
- `valid = false` hoặc đơn `CANCELLED`: làm mờ QR, báo vé không còn hiệu lực. Đơn `CANCEL_REQUESTED` vẫn còn vé hợp lệ.
- Khi mở màn vé QR nên tăng độ sáng màn hình và trả lại khi rời.
- Đăng xuất phải xóa vé đã lưu của tài khoản đó.
- Nút "Lưu thành ảnh" chụp thẻ vé (thông tin chuyến bay và QR) thành PNG rồi lưu vào thư viện ảnh (`expo-media-library`, xin quyền chỉ ghi). Chạy được khi không có mạng; ẩn khi vé đã thu hồi.
