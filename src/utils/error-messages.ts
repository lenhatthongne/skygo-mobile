import { isApiError } from '@/services/api/errors';

function waitText(seconds?: number) {
  if (!seconds) return 'một lúc';
  return seconds >= 60 ? `${Math.ceil(seconds / 60)} phút` : `${seconds} giây`;
}

/** Vietnamese message for an error, chosen by HTTP status and `code`, never by server text. */
export function errorMessage(error: unknown, fallback = 'Có lỗi xảy ra, vui lòng thử lại.') {
  if (!isApiError(error)) return fallback;
  switch (error.kind) {
    case 'network':
      return 'Không thể kết nối tới máy chủ. Hãy kiểm tra mạng rồi thử lại.';
    case 'timeout':
      return 'Máy chủ đang khởi động hoặc phản hồi chậm (có thể mất khoảng 1 phút). Vui lòng thử lại sau giây lát.';
    case 'canceled':
      return '';
  }
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'Email hoặc mật khẩu không đúng.';
    case 'ACCOUNT_LOCKED':
      return 'Tài khoản tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau ít phút.';
    case 'ACCOUNT_BLOCKED':
      return 'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.';
    case 'EMAIL_EXISTS':
      return 'Email này đã được đăng ký.';
    case 'OTP_INVALID':
      return 'Mã không đúng hoặc đã được sử dụng.';
    case 'OTP_EXPIRED':
      return 'Mã đã hết hạn. Hãy gửi lại mã mới.';
    case 'OTP_RATE_LIMITED':
      return `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${waitText(error.retryAfterSeconds)}.`;
    case 'EMAIL_DELIVERY_FAILED':
      return 'Không gửi được email xác thực. Vui lòng thử lại sau.';
    case 'VALIDATION_ERROR':
      return 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các ô nhập.';
    case 'SOLD_OUT':
      return 'Hạng vé này không còn đủ chỗ cho nhóm của bạn. Vui lòng chọn hạng vé hoặc chuyến khác.';
    case 'FLIGHT_UNAVAILABLE':
      return 'Chuyến bay này không còn mở bán. Vui lòng chọn chuyến khác.';
    case 'INVALID_PASSENGER':
      return 'Hành khách phải từ 14 ngày tuổi tại ngày bay. Vui lòng kiểm tra lại ngày sinh.';
    case 'HOLD_EXPIRED':
      return 'Đã hết thời gian giữ chỗ cho đơn này.';
    case 'IDEMPOTENCY_CONFLICT':
      return 'Yêu cầu thanh toán bị trùng. Vui lòng thử lại.';
    case 'INVALID_STATE':
      return 'Đơn này không còn ở trạng thái có thể thanh toán.';
    case 'ASSISTANT_RATE_LIMITED':
      return `Bạn nhắn hơi nhanh. Vui lòng thử lại sau ${waitText(error.retryAfterSeconds)}.`;
    case 'ASSISTANT_UNAVAILABLE':
      return 'Trợ lý hiện chưa sẵn sàng. Bạn có thể xem Câu hỏi thường gặp hoặc gửi yêu cầu hỗ trợ.';
    case 'INVALID_ROUND_TRIP':
      return 'Hai chặng chưa khớp: chuyến về phải đi ngược hành trình và khởi hành ít nhất 2 giờ sau khi chuyến đi hạ cánh.';
    case 'INVALID_IMAGE':
      return 'Chỉ nhận ảnh JPG, PNG hoặc WebP. Vui lòng chọn ảnh khác.';
    case 'FILE_TOO_LARGE':
      return 'Ảnh quá lớn (tối đa 2 MB). Hãy chọn ảnh khác.';
    case 'STORAGE_ERROR':
      return 'Chưa lưu được ảnh. Vui lòng thử lại sau.';
    case 'SEAT_TAKEN':
      return 'Ghế bạn chọn vừa có người đặt. Vui lòng chọn ghế khác.';
    case 'INVALID_SEAT':
      return 'Ghế đã chọn không hợp lệ cho hạng vé này. Vui lòng chọn lại.';
    case 'INVALID_BAGGAGE':
      return 'Gói hành lý đã chọn không còn áp dụng cho hạng vé này. Vui lòng chọn lại.';
    case 'CURRENT_PASSWORD_INCORRECT':
      return 'Mật khẩu hiện tại không đúng.';
    case 'CANCELLATION_NOT_ALLOWED':
      return 'Đơn này không thể hủy. Hạng vé phải cho phép hoàn hủy và còn ít nhất 24 giờ trước giờ bay.';
    case 'NOT_FOUND':
      return 'Không tìm thấy dữ liệu này. Có thể nó đã bị xóa.';
    case 'REFRESH_TOKEN_INVALID':
    case 'UNAUTHORIZED':
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }
  if (error.status && error.status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
  return fallback;
}

/** Field → message map from a VALIDATION_ERROR response. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error) || !error.errors) return {};
  const result: Record<string, string> = {};
  for (const { field, message } of error.errors) result[field] ??= message;
  return result;
}
