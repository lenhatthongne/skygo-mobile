# Định dạng dữ liệu

- Tiền là số nguyên VND, hiển thị `1.700.000 ₫`. Không dùng số thực để tính tiền; dùng số tiền do server trả.
- Thời gian API là ISO-8601 UTC. Hiển thị ngày giờ bay theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`), giờ 24 giờ `06:00`, ngày `20/11/2026`.
- Tham số lọc giờ (`departFrom`/`departTo`, `HH:mm`) và `date` tính theo giờ Việt Nam. Khoảng giờ qua nửa đêm phải tách thành hai truy vấn.
- Tên hành khách gửi lên là chữ in hoa không dấu, khớp `[A-Z][A-Z ]{0,48}[A-Z]`. Danh xưng: `MR|MRS|MS|MSTR|MISS`.
- Loại khách `ADT|CHD|INF`: người lớn từ 12 tuổi, trẻ em 2 đến dưới 12, em bé dưới 2. Mỗi người lớn kèm tối đa 1 em bé (`accompanyingRef`), tối đa 9 khách có ghế.
- Số điện thoại khớp `[+]?[0-9]{9,14}`.
