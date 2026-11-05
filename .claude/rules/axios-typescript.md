---
paths:
  - "src/services/**"
  - "src/types/**"
---
# Axios: TypeScript

- Bật `strict` (đã bật trong `tsconfig.json`). Không dùng `any` cho dữ liệu API; dùng `unknown` rồi thu hẹp kiểu.
- Truyền generic cho từng lời gọi: `api.get<Api.PageResponse<Api.Flight>>('/flights/search', { params })`. Type request và response theo DTO backend (camelCase), đặt trong `src/types/` (xem `typescript-global-types.md`).
- Hàm bọc dùng chung, mọi module API đi qua nó để bóc `data` và ép kiểu một chỗ:
  `async function request<T>(config: AxiosRequestConfig): Promise<T> { const { data } = await api.request<T>(config); return data; }`
- Mở rộng cấu hình của axios cho cờ riêng bằng module augmentation, trong `src/types/axios.d.ts` (file phải có `import 'axios'` để thành module):
  `declare module 'axios' { interface AxiosRequestConfig { skipAuth?: boolean } }`
- Lỗi chuẩn hóa là một lớp `ApiError extends Error` với: `status?: number`, `code?: string` (từ `problem+json`), `title`, `detail`, `errors?` (lỗi theo trường khi `VALIDATION_ERROR`), `quote?` (khi `PRICE_CHANGED`), `kind: 'http' | 'network' | 'timeout' | 'canceled'`. Dùng `axios.isAxiosError(e)` để thu hẹp kiểu trong interceptor; ngoài interceptor chỉ dùng `ApiError` (kiểm tra bằng `instanceof` hoặc hàm `isApiError`).
- Hình dạng chính xác của `errors` và `quote` phải đối chiếu với `/v3/api-docs` hoặc DTO backend, không đoán.
- Không ép kiểu bừa (`as Foo`) trên dữ liệu từ server nếu có thể mô tả bằng type chính xác.
