---
paths:
  - "src/types/**"
---
# Type toàn cục (global types)

Mục đích: dùng DTO của API ở mọi nơi mà không phải `import` lặp lại. Tham khảo: https://bobbyhadz.com/blog/typescript-make-types-global

- Đặt file khai báo trong `src/types/*.d.ts` (đã có `src/types/css.d.ts`). `tsconfig.json` đã include `**/*.ts` nên các file này được nhận tự động; không thêm vào `include` nếu không cần.
- **File `.d.ts` KHÔNG có `import`/`export`** là script: mọi khai báo cấp cao là global.
- **File CÓ `import`/`export`** là module: phải bọc trong `declare global { ... }` và thêm `export {}` nếu không có export nào khác.
- Để tránh làm bẩn không gian tên, gom type nghiệp vụ vào một namespace toàn cục, ví dụ `Api`: `declare namespace Api { interface Airport {...} interface PageResponse<T> {...} }` → dùng `Api.Airport`, `Api.PageResponse<Api.Flight>`.
- Chia file theo miền: `types/api-common.d.ts` (PageResponse, ProblemDetail), `api-auth.d.ts`, `api-flight.d.ts`, `api-booking.d.ts`, `api-support.d.ts`.
- Chỉ đưa type dùng ở nhiều nơi (DTO API, enum trạng thái) vào global. Type riêng của một màn hình hoặc component để cạnh file đó, không đưa vào global.
- Hằng số và enum cần giá trị lúc chạy (ví dụ danh sách trạng thái) KHÔNG đặt trong `.d.ts` vì file này chỉ chứa type. Đặt vào `src/constants/` và dùng union literal trong type (`type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | ...`).
- Giữ type khớp DTO backend. Khi backend đổi, cập nhật type trước rồi chạy `npx tsc --noEmit` để thấy chỗ bị ảnh hưởng.
