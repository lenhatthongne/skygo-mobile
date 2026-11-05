# Thông báo đẩy (Expo Push)

Code: `src/services/push/push-notifications.ts`, `src/hooks/use-push-notifications.ts`, `src/services/api/push.ts`.

- Đăng ký thiết bị bằng `PUT /me/push-devices` `{expoToken, platform: ANDROID|IOS}` (idempotent, token đã có sẽ chuyển sang tài khoản đang đăng nhập). Gỡ bằng `POST /me/push-devices/unregister` `{expoToken}`. Token Expo lưu trong `expo-secure-store`.
- `registerForPush` chạy single-flight. Khi mở app đã đăng nhập thì gọi với `ask: false`; chỉ hỏi quyền (`ask: true`) đúng lúc có lý do, hiện tại là ở bước thanh toán. Từ chối quyền thì app vẫn dùng bình thường.
- Android dùng channel `default` (`ensureChannel`). Push cần development build và `projectId` EAS; không chạy trong Expo Go. Thiếu điều kiện thì trả `unavailable`, không báo lỗi cho người dùng.
- Server chỉ gửi hai loại payload `data`:
  - `BOOKING_CONFIRMED {type, bookingId, userId}`: gửi sau khi thanh toán thành công (outbox sau commit, retry có backoff, có thể đến hơn một lần). Lỗi push không ảnh hưởng thanh toán.
  - `FLIGHT_REMINDER {type, bookingId}`: nhắc giờ bay, xem `flight-reminders.md`.
- Luôn đọc payload qua `parseBookingPush` (đúng `type`, `bookingId` là UUID); payload lạ thì bỏ qua. Chạm thông báo mở `/trips/[id]` chỉ khi đang đăng nhập và `userId` (nếu có) trùng tài khoản hiện tại.
- Đăng xuất: gọi `unregisterFromPush` **trước** `/auth/logout`, vì lúc đó phiên còn hiệu lực.
- Không thêm loại thông báo mới khi chưa được yêu cầu và backend chưa hỗ trợ. Không log Expo token.
