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
