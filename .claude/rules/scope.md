# Phạm vi và nguyên tắc chung

Mobile SkyGo là ứng dụng khách hàng (role `CUSTOMER`) viết bằng Expo Router. Trao đổi bằng tiếng Việt. Đọc `AGENTS.md`, `package.json` và code hiện có trước khi sửa.

- Chỉ làm màn hình và thao tác thuộc yêu cầu. Không dùng API `/admin/**`, không tự thêm role, endpoint, trường JSON hay trạng thái mà backend chưa có.
- Không bật mock để che lỗi tích hợp. Nếu backend chưa chạy hoặc thiếu thông tin kết nối, nêu rõ.
- Backend đã hỗ trợ: khứ hồi (hai đơn liên kết), chọn ghế, hành lý mua thêm, voucher giảm giá, ảnh đại diện và hồ sơ mở rộng. Backend chưa hỗ trợ: nhiều chặng, bảo hiểm, yêu thích, lọc theo điểm dừng, đăng nhập Facebook/Google (hai nút ở màn chào chỉ báo "đang phát triển"). Không dựng các tính năng chưa hỗ trợ.
- Thông báo đã có: push "Đặt vé thành công" (`BOOKING_CONFIRMED`, `/me/push-devices`, Expo Push) và nhắc giờ bay (nhắc cục bộ 24 giờ/3 giờ, hoặc push `FLIGHT_REMINDER` khi Admin bật). Chi tiết: `push-notifications.md`, `flight-reminders.md`. Không thêm loại thông báo khác khi chưa được yêu cầu.
- Khi đổi hợp đồng API, cập nhật backend, client và tài liệu liên quan; không tự sửa backend chỉ để mobile chạy.
- Giữ nguyên thay đổi đang có trong cây làm việc.
- Mục tiêu bắt buộc: chạy được trên Android và iOS. Mã web có sẵn từ template (file `.web.tsx`, nhánh `Platform.OS === 'web'`) được giữ nguyên để tận dụng, nhưng không cần tối ưu hay kiểm thử riêng cho web.
