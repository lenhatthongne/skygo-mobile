# Thanh toán (mô phỏng)

- Phương thức: `SIMULATED_CARD`, `SIMULATED_BANK`, `SIMULATED_WALLET`; kết quả mô phỏng `SUCCESS`, `FAILED`, `CANCELLED`. Giao diện ghi rõ là mô phỏng, không nhập số thẻ thật.
- Mỗi lần thanh toán gửi header `Idempotency-Key` là UUID.
- Timeout hoặc lỗi mạng: không kết luận thất bại. Hỏi lại `GET /bookings/{id}` hoặc retry với cùng key và cùng payload. Báo người dùng không thanh toán lại.
- Sau một lần `FAILED` đã nhận kết quả, lần thử mới dùng key mới.
- `IDEMPOTENCY_CONFLICT`: không đổi payload với key cũ.
- Thanh toán thành công thì xóa trạng thái nháp của luồng đặt vé và chuyển sang màn kết quả, rồi tải vé.
