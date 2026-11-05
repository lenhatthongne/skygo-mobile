# Biểu mẫu

- Kiểm tra dữ liệu phía máy theo ràng buộc của DTO trước khi gửi, nhưng coi lỗi từ server là nguồn cuối. Ánh xạ `errors` theo trường vào đúng ô nhập.
- Báo lỗi ngay dưới ô nhập, không dùng cửa sổ báo lỗi cho lỗi từng trường. Nút gửi chỉ bật khi dữ liệu hợp lệ; trong lúc gửi thì khóa nút và hiện trạng thái.
- Khi gửi thất bại, giữ nguyên dữ liệu người dùng đã nhập.
- Tên hành khách: tự chuyển chữ có dấu sang in hoa không dấu và cho người dùng thấy kết quả. Danh xưng chọn bằng chip.
- Mật khẩu: hiện quy tắc theo thời gian thực, có nút xem/ẩn.
- Gợi ý bàn phím đúng loại (`email-address`, `phone-pad`, `number-pad`) và `autoComplete` phù hợp.
- Chọn nhanh từ hành khách đã lưu (`/me/passengers`) khi đặt vé.
