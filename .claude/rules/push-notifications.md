# Thông báo đẩy (Expo Push)

Code: `src/services/push/push-notifications.ts`, `src/hooks/use-push-notifications.ts`, `src/services/api/push.ts`.

- Đăng ký thiết bị bằng `PUT /me/push-devices` `{expoToken, platform: ANDROID|IOS}` (idempotent, token đã có sẽ chuyển sang tài khoản đang đăng nhập). Gỡ bằng `POST /me/push-devices/unregister` `{expoToken}`. Token Expo lưu trong `expo-secure-store`.
- `requestNotificationPermission` hỏi quyền tại trang giới thiệu thứ 4 về nhắc giờ bay, sau khi trang này hiển thị; chưa đăng nhập nên không đăng ký token lên backend. Nếu Bỏ qua ở ba trang trước, app vào thẳng Welcome và hỏi tại đó qua tham số `askNotifications=1` được xóa ngay sau khi nhận. Từ chối hoặc lỗi quyền vẫn cho tiếp tục vào app; quay lại Welcome không tự hỏi lại.
- `registerForPush` chạy single-flight. Khi mở app đã đăng nhập và ở bước thanh toán thì gọi với `ask: false`, chỉ đăng ký token khi đã có quyền; không hiện lại hộp thoại tại thanh toán. Khách hàng có thể bật quyền sau trong Cài đặt.
- Android dùng channel `default` (`ensureChannel`). Push cần development build và `projectId` EAS; không chạy trong Expo Go. Thiếu điều kiện thì trả `unavailable`, không báo lỗi cho người dùng.
- Server chỉ gửi hai loại payload `data`:
  - `BOOKING_CONFIRMED {type, bookingId, userId}`: gửi sau khi thanh toán thành công (outbox sau commit, retry có backoff, có thể đến hơn một lần). Lỗi push không ảnh hưởng thanh toán.
  - `FLIGHT_REMINDER {type, bookingId}`: nhắc giờ bay, xem `flight-reminders.md`.
- Luôn đọc payload qua `parseBookingPush` (đúng `type`, `bookingId` là UUID); payload lạ thì bỏ qua. Chạm thông báo mở `/trips/[id]` chỉ khi đang đăng nhập và `userId` (nếu có) trùng tài khoản hiện tại.
- Đăng xuất: gọi `unregisterFromPush` **trước** `/auth/logout`, vì lúc đó phiên còn hiệu lực.
- Không thêm loại thông báo mới khi chưa được yêu cầu và backend chưa hỗ trợ. Không log Expo token.

## Thông báo cục bộ khi đặt vé xong và số chưa đọc
- `src/services/booking-notifications.ts` (`notifyBookingConfirmed`): sau khi thanh toán `CONFIRMED`, hiện ngay thông báo "Đặt vé thành công" trên máy. Chỉ hiện khi đã được cấp quyền và máy **chưa có** token push (có token thì server tự gửi `BOOKING_CONFIRMED`, không báo hai lần). Lỗi thì nuốt, không ảnh hưởng thanh toán.
- `src/services/notification-inbox.ts`: danh sách thông báo đã nhận (tối đa 50, mới nhất trước) theo tài khoản, lưu trên máy (AsyncStorage `skygo.notifications.<userId>`), không có API backend. Thông báo được ghi khi tới lúc đang mở app hoặc còn trong khay lúc mở app; thông báo đã vuốt khỏi khay khi app đóng thì không ghi được. Số chưa đọc hiện trên biểu tượng app (`setBadgeCountAsync`), tab "Chuyến đi" và chuông ở Trang chủ.
- Màn Thông báo `src/app/notifications.tsx` (mở từ chuông ở `home.tsx`): nhóm "Hôm nay" và "Trước đó", chấm xanh khi chưa đọc, nút "Đánh dấu tất cả đã đọc", trạng thái rỗng. Bấm một dòng đánh dấu đúng thông báo đó đã đọc rồi mở `/trips/[id]`.
- Một thông báo chỉ được coi là **đã đọc khi khách chạm đúng thông báo đó** (dòng trong màn Thông báo, dải trong app, hoặc thông báo ở khay hệ thống), hoặc bấm "Đánh dấu tất cả đã đọc". Tự mở đơn bằng đường khác, mở app, hay thanh toán xong rồi sang màn kết quả **không** làm thành đã đọc. Số chưa đọc hiện ở chấm đỏ có số trên chuông Trang chủ, tab Chuyến đi và biểu tượng app; dòng chưa đọc có chấm đỏ. Đăng xuất đặt lại về 0.
