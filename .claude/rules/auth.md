# Xác thực

- Đăng ký và đăng nhập trả OTP challenge, chưa có token. Chỉ `/auth/login/verify` trả JWT. Màn OTP dùng chung cho đăng ký và đăng nhập, có gửi lại (`/auth/otp/resend`) và đếm ngược theo `resendAfterSeconds`/`expiresAt`.
- Lưu accessToken VÀ refreshToken bằng kho an toàn của thiết bị (`expo-secure-store`), không dùng AsyncStorage hay mã nguồn. Cài thêm bằng `npx expo install`. Giữ bản sao trong bộ nhớ cho interceptor.
- Khi mở app: có token thì gọi `/auth/me`; 401 thì thử refresh một lần (xem `axios-interceptors.md`), thất bại thì xóa token và chuyển về `(auth)`.
- Đăng xuất: trước tiên gỡ push device (`unregisterFromPush`, cần phiên còn hiệu lực) và hủy nhắc giờ bay cục bộ (`cancelFlightReminders`); sau đó gọi `POST /auth/logout` với refreshToken (bỏ qua lỗi mạng), rồi xóa cả hai token và vé đã lưu. Access token đã cấp vẫn hợp lệ đến khi hết hạn, vì vậy phải xóa ở máy.
- Sau đăng nhập phải kiểm tra `role === "CUSTOMER"`. Tài khoản `ADMIN` không dùng mobile; báo rõ và không giữ phiên.
- Phân biệt `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `EMAIL_EXISTS` và lỗi validation trong thông báo.
- Mật khẩu: 8 đến 72 byte, có chữ và số. Không ghi mật khẩu, OTP, token vào log hay thông báo lỗi.
- OTP mẫu chỉ có ở profile `dev` cho tài khoản `@skygo-demo.invalid`. Không đưa vào mã mobile hay bản phát hành.
