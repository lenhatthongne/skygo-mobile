# Hiệu năng

Thứ tự ưu tiên khi cân nhắc: đúng và an toàn trước, rồi kiểu dữ liệu chặt, rồi mới tới hiệu năng. Không tối ưu sớm khi chưa đo.

**Ưu tiên cao (làm ngay từ đầu)**
- Một instance axios duy nhất, token giữ trong bộ nhớ, không đọc secure store mỗi request.
- Hủy request cũ khi người dùng đổi bộ lọc hoặc thoát màn: truyền `signal` của `AbortController` vào axios, bỏ qua lỗi `ERR_CANCELED`. Không để response cũ ghi đè kết quả mới.
- Danh sách dài (kết quả chuyến bay, chuyến đi) dùng `FlatList` với `keyExtractor` ổn định, phân trang theo `page`/`size`, không bọc trong `ScrollView`. Chỉ tải trang tiếp khi cuộn tới cuối.
- Gọi song song các request độc lập bằng `Promise.all` (ví dụ danh sách sân bay và hãng bay khi mở màn tìm kiếm).
- Debounce ô tìm kiếm (khoảng 300 ms).

**Ưu tiên trung bình**
- Cache trong bộ nhớ cho dữ liệu ít đổi (`/airports`, `/airlines`, `/faqs`) và gộp request GET đang chạy trùng nhau. Không cache giá hoặc chỗ trống; luôn báo giá lại từ server.
- Ảnh dùng `expo-image` (cache và placeholder). Không tải ảnh lớn không cần thiết.
- Dự án bật React Compiler (`experiments.reactCompiler` trong `app.json`): không thêm `useMemo`/`useCallback`/`React.memo` theo thói quen; chỉ thêm khi đo thấy cần.
- Tách state theo phạm vi nhỏ, tránh để một context lớn khiến cả cây render lại.

**Ưu tiên thấp (khi đã đo)**
- Dùng thư viện cache dữ liệu (ví dụ TanStack Query) nếu số màn gọi API nhiều và code cache tự viết bắt đầu phức tạp.
- Tối ưu kích thước bundle, tải lười các màn nặng (bản đồ).
- Chỉ log khi `__DEV__`; không log trong bản phát hành.
