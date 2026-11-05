---
paths:
  - "src/services/**"
---
# Axios: cấu hình client

- Dùng `axios` cho mọi lời gọi API. Cài bằng `npx expo install axios`. Không gọi `fetch`/`axios` trực tiếp trong màn hình hay component.
- Chỉ có MỘT instance tạo bằng `axios.create` trong `src/services/api/client.ts`; mọi module API dùng lại instance này (không tạo instance mỗi lần gọi).
- Cấu hình mặc định: `baseURL` từ `EXPO_PUBLIC_*` theo nền tảng (đã có `EXPO_PUBLIC_ANDROID_API_URL`, `EXPO_PUBLIC_IOS_API_URL`), đường dẫn bắt đầu bằng `/api`; `timeout` 60 giây (backend demo trên Render Free cần khoảng 50 giây để thức dậy; `src/services/api/warmup.ts` gọi đánh thức khi mở app); header `Accept: application/json`. Có thể ghi đè `timeout` riêng cho từng lời gọi (ví dụ thanh toán).
- Cấu trúc thư mục: `src/services/api/client.ts` (instance + interceptor), `src/services/api/errors.ts` (ApiError), một file theo miền: `auth.ts`, `catalog.ts`, `flights.ts`, `bookings.ts`, `passengers.ts`, `support.ts`.
- Mỗi hàm API là một hàm có kiểu rõ ràng trả dữ liệu đã bóc (`Promise<Api.Flight>`), màn hình không phải đọc `response.data`.
- `localhost` trên điện thoại thật là chính điện thoại; Android emulator thường dùng `10.0.2.2`. Kiểm tra kết nối trước khi kết luận lỗi API.
- Nguồn hợp đồng: `skygo-backend/docs/API.md`, controller/DTO và `/v3/api-docs` khi backend đang chạy.
