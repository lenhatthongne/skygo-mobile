# Vị trí và bản đồ

- Backend chỉ trả tọa độ sân bay (`latitude`, `longitude`). Vị trí người dùng, khoảng cách và bản đồ là phần của mobile; không giả định backend có vị trí hiện tại của khách.
- Xin quyền vị trí đúng lúc cần dùng (màn khám phá sân bay hoặc gợi ý gần nhất), giải thích lý do. Từ chối quyền thì app vẫn dùng được, chỉ không có gợi ý gần nhất.
- Tính khoảng cách trên thiết bị; không gửi vị trí người dùng lên server.
- Android: `airports-map.android.tsx` dùng MapLibre với style `https://tiles.openfreemap.org/styles/liberty`; sân bay vẽ bằng `GeoJSONSource` + `Layer` để MapLibre tự ẩn nhãn chồng nhau. Giữ dòng ghi nguồn OpenStreetMap. iOS: `airports-map.tsx` dùng Apple Maps. Không dùng Google Maps (không có billing cho Việt Nam).
- Dùng thư viện cài bằng `npx expo install` và đúng tài liệu phiên bản Expo hiện tại. Thư viện có mã native cần development build, không chạy được trong Expo Go.
