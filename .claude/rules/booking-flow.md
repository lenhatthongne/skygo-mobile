# Luồng đặt vé

1. Tìm chuyến `GET /flights/search` → chọn chuyến → xem `fareClasses[]`.
2. Báo giá `POST /fare-classes/{id}/quote` với số khách → `total`.
3. Nhập hành khách và liên hệ → `POST /bookings` với `fareClassId` và `expectedTotal` lấy từ báo giá.
4. Thanh toán `POST /bookings/{id}/payments` → xem vé.

- Không cố định ID hạng vé hay giá seed. Hạng vé hiện có `ECO_SAVER`, `ECO_FLEX`, `BUSINESS`; hiển thị theo `classCode` và dữ liệu backend trả, không đoán tên.
- `409 PRICE_CHANGED`: lấy báo giá mới trong phản hồi, hiện giá cũ và mới, để người dùng chấp nhận hoặc đổi chuyến. Giữ nguyên dữ liệu hành khách đã nhập.
- `SOLD_OUT`: báo hết chỗ và đề xuất tìm lại.
- Giữ chỗ có hạn (`holdExpiresAt`): hiển thị đồng hồ đếm ngược ở bước thanh toán; hết hạn thì xử lý `HOLD_EXPIRED` và trạng thái `EXPIRED`.
- Trạng thái đơn: `PENDING_PAYMENT`, `PAYMENT_FAILED`, `CONFIRMED`, `CANCEL_REQUESTED`, `CANCELLED`, `EXPIRED`. Chỉ hiện thao tác hợp với trạng thái; server kiểm tra cuối cùng.
- Hủy vé cần `GET /bookings/{id}/cancellation-quote` trước, sau đó `POST .../cancellation-requests`. Chỉ hạng `ECO_FLEX`/`BUSINESS` và trước giờ bay ít nhất 24 giờ.
- Báo giá `/fare-classes/{id}/quote` không kiểm tra số chỗ còn: client tự lọc hạng vé có `seatsAvailable` ≥ số khách có ghế (người lớn + trẻ em) trước khi cho chọn.
- Màn chọn hạng vé báo giá song song cho các hạng còn đủ chỗ để hiện tổng thật; tổng ở chân màn là `total` của hạng đang chọn. Chuyển sang đặt chỗ bằng route params (`flightId`, `fareClassId`, số khách) rồi báo giá lại ngay trước `POST /bookings`, không truyền `expectedTotal` đã cũ.

## Đổi ghế (hạng thương gia)
- Chỉ đơn hạng `BUSINESS`, trạng thái `CONFIRMED` hoặc chưa thanh toán còn giữ chỗ, đến 2 giờ trước giờ bay, miễn phí. Mobile: thẻ "Đổi ghế" ở Chi tiết đặt chỗ (`canChangeSeats` trong `utils/trips.ts`) mở `app/(tabs)/trips/[id]/change-seat.tsx`, gọi `PUT /bookings/{id}/seats` (`changeSeats` trong `services/api/bookings.ts`).
- Sơ đồ ghế có cờ `held`: ghế chỉ đang được đơn chưa thanh toán giữ chỗ (tối đa 15 phút), hiện riêng (viền đứt, màu cam) và **không chọn được**, như ghế đã có người. Ghế của chính đơn này tính là trống để đổi qua lại.
- `SEAT_TAKEN`: tải lại sơ đồ và báo chọn ghế khác; `SEAT_CHANGE_NOT_ALLOWED` / `SEAT_CHANGE_CLOSED`: báo bằng `errorMessage`.
- Dòng quyền lợi "Đổi ghế miễn phí đến 2 giờ trước giờ bay" hiện ở `fareHighlights` và `fareBenefits` cho hạng thương gia; hạng khác hiện mờ "Không đổi ghế sau khi đặt".

## Lưu voucher vào tài khoản
- Danh sách ưu đãi nằm ở màn **Ưu đãi** (`src/app/offers.tsx`, mở từ ô "Ưu đãi" ở hàng lối tắt Trang chủ; Trang chủ không còn danh sách mã mà có khung ảnh `DestinationShowcase` ở cuối). Mỗi ưu đãi có mã có nút **Lưu** (`saveVoucher` → `POST /me/vouchers/{code}/save`). Lưu xong nút thành **Đã lưu**, voucher có hạn 7 ngày (đặt ở backend, `valid_days`) và dòng "Còn 6 ngày 23:59:10" đếm ngược mỗi giây (`timeLeft` trong `utils/vouchers.ts`). Bấm "Đã lưu" mở Tài khoản → Voucher của tôi.
- `Api.Voucher.saved`: màn Voucher của tôi chỉ hiện voucher `saved` (được cấp hoặc đã lưu); bộ chọn voucher ở bước thanh toán vẫn hiện cả mã công khai chưa lưu, và vẫn nhập tay được mã.
