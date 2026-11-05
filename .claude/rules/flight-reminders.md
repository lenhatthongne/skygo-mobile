# Nhắc giờ bay

Có hai nguồn nhắc, không bao giờ chạy cùng lúc cho một tài khoản.

## Nhắc cục bộ (mặc định)
Code: `src/services/flight-reminders.ts`.

- Mỗi đơn `CONFIRMED` chưa bay có hai lời nhắc hẹn trên máy: **24 giờ** và **3 giờ** trước giờ cất cánh. Nhắc cục bộ không cần server push nên vẫn báo khi không có mạng. Mốc chỉ còn dưới 1 phút hoặc đã qua thì không hẹn.
- Identifier `skygo.reminder.<bookingId>.<24h|3h>`; payload `data` là `{type: "FLIGHT_REMINDER", bookingId}`, chạm thông báo mở đơn (xem `push-notifications.md`).
- `syncFlightReminders(bookings)` chạy khi tải danh sách đơn (`src/hooks/use-bookings.ts`): thêm mốc còn thiếu, xóa mốc của đơn đã hủy hoặc đã bay. Hàm này không tự hỏi quyền và không được làm hỏng màn gọi nó (nuốt lỗi).
- Công tắc nằm trong Cài đặt (`src/app/(tabs)/account/settings.tsx`), mặc định bật, lưu AsyncStorage. Bật thì hỏi quyền nếu còn hỏi được, không thì mở cài đặt hệ thống. Tắt thì `cancelFlightReminders`.
- Nội dung qua i18n `reminder.*`. Giờ và ngày theo `Asia/Ho_Chi_Minh` (`formatTime`, `formatDayMonth`).

## Nhắc từ server (Admin bật)
- `GET /me/reminder-config` trả `{serverReminders, leadMinutes}`. Khi `serverReminders = true`, app xóa và không hẹn nhắc cục bộ để không báo trùng. Server không gọi được thì coi là tắt, dùng nhắc cục bộ. Kết quả cache 60 giây.
- Server gửi push `FLIGHT_REMINDER` theo các mốc Admin cấu hình, mỗi đơn chỉ nhận mốc gần nhất đã tới (mốc xa hơn đã qua ghi `SKIPPED`), nên đơn đặt sát giờ không bị báo "còn 24 giờ". Nội dung push luôn là tiếng Việt.
- Cấu hình mốc, nhật ký và gửi tay (`/admin/flight-reminders/**`, `/admin/bookings/{id}/flight-reminder`) thuộc web Admin; mobile không gọi.

## Đăng xuất
- Gọi `cancelFlightReminders` để xóa mọi nhắc cục bộ của tài khoản đang rời (cùng lúc gỡ push device).
