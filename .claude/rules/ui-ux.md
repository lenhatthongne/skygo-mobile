# UI và UX

- Ngôn ngữ thiết kế theo mockup: màu chủ đạo xanh ngọc (`#0894AE`), thẻ bo góc lớn, nút hành động chính cố định ở đáy màn, tiêu đề ngắn.
- Đặt màu, khoảng cách, chữ vào `src/constants/theme.ts`; không rải mã màu trong màn hình. Hỗ trợ chế độ sáng và tối nếu theme đã có.
- Màu trạng thái thống nhất: xanh lá là hợp lệ/thành công, cam là cần hành động hoặc đang giữ chỗ, tím là chờ duyệt, đỏ là lỗi hoặc đã hủy, xanh dương là thông tin.
- Mọi màn dữ liệu đều có đủ: đang tải (skeleton), rỗng, lỗi có nút thử lại, thành công. Lỗi mạng không được hiển thị như danh sách rỗng.
- Thông báo lỗi nói rõ: chuyện gì xảy ra, đã bị trừ tiền chưa, nên làm gì tiếp. Không đổ lỗi cho người dùng.
- Vùng chạm tối thiểu 44×44. Chừa safe area (`react-native-safe-area-context`). Bàn phím không che ô nhập và nút chính.
- Hành động nguy hiểm (hủy vé, đăng xuất) tách riêng, tô đỏ, có bước xác nhận.
- Có nhãn truy cập (`accessibilityLabel`) cho nút chỉ có biểu tượng. Không chỉ dùng màu để truyền đạt trạng thái.
- Câu chữ tiếng Việt, nhất quán thuật ngữ: "Chuyến đi", "Đặt chỗ", "Giữ chỗ", "Hạng vé".
