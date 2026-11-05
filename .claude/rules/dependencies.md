# Thư viện

- Luôn cài bằng `npx expo install <gói>` để lấy đúng phiên bản tương thích SDK. Không đổi package manager.
- Thêm thư viện khi tới đúng tính năng cần nó; không cài trước một loạt.
- Ưu tiên module Expo; thư viện có mã native cần development build, không chạy trong Expo Go.

| Việc | Thư viện |
|---|---|
| Gọi API | `axios` (đã cài) |
| Lưu token | `expo-secure-store` (đã cài) |
| Biểu tượng | `@expo/vector-icons` (đã cài, dùng Feather và MaterialCommunityIcons) |
| Vẽ mã QR | `react-native-qrcode-svg` (cần `react-native-svg`) |
| Vị trí | `expo-location` |
| Lưu vé offline | `expo-sqlite` hoặc `@react-native-async-storage/async-storage` |
| Độ sáng khi mở vé | `expo-brightness` |
| Sao chép | `expo-clipboard` |
| Bản đồ sân bay | Android: `@maplibre/maplibre-react-native` (OpenFreeMap, không key); iOS: `react-native-maps` (Apple Maps) |
| Bàn phím không che ô nhập | `react-native-keyboard-controller` (đã cài, `KeyboardProvider` ở layout gốc) |
| Thông báo đẩy, nhắc giờ bay cục bộ | `expo-notifications` (đã cài) |

Tự viết bằng code thuần: định dạng tiền và ngày (`Intl`), chuyển tên sang in hoa không dấu, lịch chọn ngày, chip, skeleton, hook đếm ngược giữ chỗ.
