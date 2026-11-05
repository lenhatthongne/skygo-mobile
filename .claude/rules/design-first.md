# Thiết kế trước, code sau

- Với màn hình mới hoặc thay đổi UI lớn: làm mockup (ảnh) và chờ người dùng duyệt trước khi viết code.
- Mockup đã duyệt nằm ở `Demo/8_flight/`: `flight_all_screens/` (bộ gốc), `missing_screens/` (24 màn bổ sung, mã A–Q), `adjusted_screens/` (10 màn gốc điều chỉnh, mã R1–R10). `missing_screens/index.html` là trang tổng hợp, ghi kèm API và quyết định UX của từng màn.
- Khi code một màn, đối chiếu mockup tương ứng: bố cục, trạng thái (loading, rỗng, lỗi), câu chữ tiếng Việt.
- Chỗ nào mockup khác hợp đồng API thì theo API và báo lại người dùng.
