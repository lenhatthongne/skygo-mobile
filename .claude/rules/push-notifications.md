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
- `src/services/notification-inbox.ts`: danh sách thông báo đã nhận (tối đa 50, mới nhất trước) theo tài khoản, lưu trên máy (AsyncStorage `skygo.notifications.<userId>`), không có API backend. Thông báo được ghi khi tới lúc đang mở app hoặc còn trong khay lúc mở app; thông báo đã vuốt khỏi khay khi app đóng thì không ghi được. Số chưa đọc hiện trên biểu tượng app (`setBadgeCountAsync`) và chuông ở Trang chủ.
- Màn Thông báo `src/app/notifications.tsx` (mở từ chuông ở `home.tsx`): nhóm "Hôm nay" và "Trước đó", chấm xanh khi chưa đọc, nút "Đánh dấu tất cả đã đọc", trạng thái rỗng. Bấm một dòng đánh dấu đúng thông báo đó đã đọc rồi mở `/trips/[id]`.
- Một thông báo chỉ được coi là **đã đọc khi khách chạm đúng thông báo đó** (dòng trong màn Thông báo, dải trong app, hoặc thông báo ở khay hệ thống), hoặc bấm "Đánh dấu tất cả đã đọc". Tự mở đơn bằng đường khác, mở app, hay thanh toán xong rồi sang màn kết quả **không** làm thành đã đọc. Số chưa đọc hiện ở chấm đỏ có số trên chuông Trang chủ và biểu tượng app; dòng chưa đọc có chấm đỏ. Đăng xuất đặt lại về 0.

## Tin nhắn hỗ trợ
- Khi SkyGo trả lời ở mục Hỗ trợ, tin hiện ở **chuông thông báo** như mọi thông báo khác: có trong danh sách (loại `SUPPORT_REPLY`, chạm để mở khung chat), chuông Trang chủ và biểu tượng app đếm nó. Thanh tab dưới cùng **không** hiện số đếm nào.
- `useSupportNotifications` (`src/hooks/use-support-notifications.ts`) hỏi server mỗi 15 giây khi app mở và đã đăng nhập (`GET /support-requests/unread`, chỉ tải danh sách hội thoại khi số tăng). Trả lời đã có sẵn lúc mở app chỉ được ghi vào danh sách; trả lời mới tới khi app đang mở còn hiện dải thông báo trong app.
- Không báo gì khi khách đang xem đúng hội thoại đó hoặc đang ở thẻ Tin nhắn (`setActiveSupportView`). Mở hội thoại đánh dấu các trả lời của nó là đã đọc (`markSupportConversationRead`) và đánh dấu đã đọc trên server.
- Màn Thông báo (`src/app/notifications.tsx`) có hai thẻ: Thông báo và Tin nhắn (`?tab=messages`, danh sách hội thoại kiểu ứng dụng chat, `ConversationList`, không có số đếm ở thẻ). Mục "Yêu cầu hỗ trợ" ở Tài khoản và lối tắt "Hỗ trợ" mở thẳng thẻ Tin nhắn; `/account/support` chỉ chuyển sang đó.

## Kết nối trực tiếp (WebSocket)
- `src/services/support-socket.ts` giữ một kết nối tới `/api/ws/support` khi app mở, đã đăng nhập (xác thực bằng tin đầu tiên, không đặt token trên địa chỉ), tự nối lại với thời gian chờ tăng dần, đóng khi app xuống nền. Server chỉ báo "hội thoại X đã đổi"; khung chat, thẻ Tin nhắn và việc kiểm tra thông báo đọc ngay qua API khi nhận được báo.
- Hỏi định kỳ vẫn giữ làm dự phòng: 4 giây (chat) khi mất kết nối, 30 giây khi đang kết nối; thẻ Tin nhắn 12 giây hoặc 45 giây.
- Chạm thông báo trả lời của SkyGo (danh sách hoặc dải trong app) mở thẳng khung chat và đưa con trỏ vào ô nhập (`focus=1`) để trả lời ngay.

## Bấm tab
- Bấm một tab, hoặc quay lại tab từ tab khác, đưa tab về màn đầu, cuộn lên đầu và tải lại (`src/hooks/use-tab-reset.ts`: `useTabResetSource` đặt ở gốc mỗi tab, `useScrollToTopOnTabReset`, `useReloadOnTabReset`). Tab Chuyến đi quay về thẻ "Sắp tới". Quay lại từ màn mở trên thanh tab (thanh toán, ghế, chi tiết đặt chỗ) không phải là reset: khách ở lại đúng chỗ.

