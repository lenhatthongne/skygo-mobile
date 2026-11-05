---
paths:
  - "src/services/**"
---
# Axios: interceptor

**Request interceptor**
- Lấy token từ kho an toàn một lần và giữ bản sao trong bộ nhớ (không đọc secure store ở mỗi request). Gắn `Authorization: Bearer <token>`.
- Cờ riêng theo từng lời gọi (`skipAuth`) để bỏ qua token cho API public (`/auth/*`, `/airports`, `/flights/search`).
- Không log body có mật khẩu, OTP hoặc token.

**Response interceptor**
- Thành công: trả nguyên response; module API bóc `data`.
- Lỗi: chuẩn hóa thành `ApiError` (xem `axios-typescript.md`) rồi `Promise.reject`. Phân loại: có `response` (lỗi từ server), `ECONNABORTED`/`ETIMEDOUT` (timeout), `ERR_NETWORK` (mất mạng), `ERR_CANCELED` (bị hủy, không hiện lỗi).
- 401: xử lý theo luồng refresh bên dưới. Chỉ khi refresh thất bại mới xóa phiên và báo cho lớp xác thực qua handler đăng ký từ ngoài (`setUnauthorizedHandler`) để tránh import vòng giữa client và store. Nhiều request cùng lúc nhận 401 chỉ được kích hoạt đăng xuất MỘT lần (dùng cờ).
- 403 và 404: không đăng xuất; trả lỗi cho màn hình xử lý.

**Refresh token (CUSTOMER)**
- Backend cấp `refreshToken` (14 ngày, dùng một lần, xoay vòng) cùng access token ở `/auth/login/verify`. Gọi `POST /auth/refresh` với `{refreshToken}` để nhận cặp token mới; `POST /auth/logout` để thu hồi phiên.
- Khi một request (không phải `/auth/*`) nhận 401: gọi refresh MỘT lần dùng chung (single-flight: lưu một promise đang chạy, các request 401 khác chờ promise này), lưu cặp token mới, rồi gửi lại request gốc đúng một lần (cờ `_retry` trong config). Gửi lại an toàn vì 401 bị từ chối trước khi xử lý nghiệp vụ; giữ nguyên `Idempotency-Key` của thanh toán.
- Request `/auth/refresh` và `/auth/logout` dùng `skipAuth` và KHÔNG được kích hoạt refresh khi nhận 401 (tránh vòng lặp). Refresh thất bại (`REFRESH_TOKEN_INVALID` hoặc mạng ổn mà server từ chối) thì xóa token và về đăng nhập (màn Q3, giữ dữ liệu đang nhập).
- Lỗi mạng hoặc timeout khi refresh KHÔNG đồng nghĩa phiên hỏng: không xóa token, báo lỗi mạng và cho thử lại. Chỉ đăng xuất khi server trả 401 cho refresh.
- Phải lưu refresh token mới ngay sau mỗi lần refresh thành công; gửi lại token cũ sẽ làm server thu hồi cả phiên.

**Retry**
- Không tự động retry POST. Riêng thanh toán, retry là thao tác có chủ đích với cùng `Idempotency-Key` và cùng payload (xem `payment.md`).
- GET có thể retry tối đa 2 lần, chỉ khi mất mạng hoặc timeout, có độ trễ tăng dần; không retry lỗi 4xx.
