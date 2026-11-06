---
paths:
  - "src/app/**"
---
# Cấu trúc route (Expo Router)

- Chia màn hình bằng route group `(ten)` và đặt `_layout.tsx` riêng cho từng group. Không dồn mọi thứ vào một layout.
- `src/app/` chỉ chứa route. Component, hook, service, hằng số để ngoài, ví dụ `src/components/`, `src/hooks/`, `src/services/`.
- Group không xuất hiện trong URL, nên hai file ở hai group khác nhau không được ra cùng một URL.
- Các tab chính dùng thư mục thật (`trips/`, `account/`) thay vì group để tránh trùng URL; mỗi thư mục có `_layout.tsx` Stack riêng.

Khung đã thống nhất:

```
src/app/
  _layout.tsx        providers, Stack gốc, chặn route theo đăng nhập (Stack.Protected)
  index.tsx          "/" chỉ chuyển hướng: đã đăng nhập → /home, chưa → /login
  (auth)/            login, register, otp
  (tabs)/            home, trips/ (chỉ danh sách + seats), explore, account/
  (trip)/            trips/[id]/ (chi tiết, giá, đổi ghế, vé, hủy) và trips/seats: URL /trips/... nhưng nằm trên tab, nên tab "Chuyến đi" chỉ chứa danh sách
  (support)/         account/support-new (modal), support-detail (chat), support (chuyển sang Tin nhắn), faq
  (passengers)/      account/passengers, passenger (modal)
  (search)/          công khai (không cần đăng nhập): search/ (form, airport, date, travellers, results, filters), flight/[id]/ (index = chi tiết, fares = chọn hạng vé)
  (booking)/         booking/passengers, payment, result (chỉ khi đã đăng nhập; nhận fareClassId và số khách qua route params, báo giá lại ở màn đầu)
```

- Tab trang chủ là `(tabs)/home.tsx` (URL `/home`), không phải `(tabs)/index.tsx`: `index.tsx` ở gốc giữ URL `/` cho việc chuyển hướng, và hai route cùng URL ở hai group sẽ xung đột. Layout gốc đặt `unstable_settings = { anchor: 'index' }`.
- Khi `Stack.Protected` đổi trạng thái, Expo Router chuyển về anchor; `/` không có route khớp thì web báo "Unmatched Route" ở `/(auth)`.
- `(search)/_layout.tsx` bọc `SearchProvider`: tiêu chí và bộ lọc tìm kiếm sống trong context khi còn ở trong group; các picker (airport, date, travellers, filters) là modal ghi ngược vào context rồi `router.back()`. API công khai gọi với `skipAuth: true`, vì backend trả 401 cho cả endpoint public nếu token gửi kèm đã hết hạn.
- Luồng tìm chuyến và đặt vé nằm ngoài `(tabs)` để ẩn thanh tab.
- Màn dùng chung (hết phiên, mất mạng) đặt ở layout gốc.
- Kiểm tra tài liệu Expo Router đúng phiên bản trong `package.json` trước khi dùng API layout, tab, sheet hay chặn route.
- **Quy tắc chống xung đột tab:** màn nào có thể được mở từ ngoài tab của nó (Trang chủ, Thông báo, trợ lý, thông báo đẩy, luồng đặt vé) phải nằm trong một route group ở gốc (`(trip)`, `(support)`, `(passengers)`), không đặt trong stack của tab. Màn nằm trong stack của tab khi mở từ ngoài sẽ chuyển sang tab đó và chồng lên màn gốc, che tab cho tới khi tắt app. Stack của tab chỉ giữ màn chỉ mở từ chính tab đó (Tài khoản: hồ sơ, voucher, thanh toán, cài đặt, đổi mật khẩu).

