import { api } from './client';
import { getRefreshToken } from './token-store';

const publicCall = { skipAuth: true } as const;

export async function register(body: Api.RegisterRequest) {
  const { data } = await api.post<Api.OtpChallenge>('/auth/register', body, publicCall);
  return data;
}

export async function login(body: Api.LoginRequest) {
  const { data } = await api.post<Api.OtpChallenge>('/auth/login', body, publicCall);
  return data;
}

/** Verifies the registration OTP. Returns the user; no token is issued. */
export async function verifyRegistration(body: Api.VerifyOtpRequest) {
  const { data } = await api.post<Api.User>('/auth/register/verify', body, publicCall);
  return data;
}

/** Verifies the login OTP and returns the session with tokens. */
export async function verifyLogin(body: Api.VerifyOtpRequest) {
  const { data } = await api.post<Api.AuthSession>('/auth/login/verify', body, publicCall);
  return data;
}

export async function resendOtp(challengeId: string) {
  const { data } = await api.post<Api.OtpChallenge>(
    '/auth/otp/resend',
    { challengeId } satisfies Api.ResendOtpRequest,
    publicCall,
  );
  return data;
}

/** Always answers with a challenge, whether or not the email has an account. */
export async function forgotPassword(email: string) {
  const { data } = await api.post<Api.OtpChallenge>(
    '/auth/password/forgot',
    { email } satisfies Api.ForgotPasswordRequest,
    publicCall,
  );
  return data;
}

/** Sets a new password with the emailed code. Every old session is revoked by the server. */
export async function resetPassword(body: Api.ResetPasswordRequest) {
  await api.post('/auth/password/reset', body, publicCall);
}

/** Returns a NEW session: the old tokens stop working, so the caller must store these. */
export async function changePassword(body: Api.ChangePasswordRequest) {
  const { data } = await api.post<Api.AuthSession>('/auth/password/change', body);
  return data;
}

export async function updateProfile(body: Api.UpdateProfileRequest) {
  const { data } = await api.put<Api.User>('/auth/me', body);
  return data;
}

export async function me() {
  const { data } = await api.get<Api.User>('/auth/me');
  return data;
}

/** Best effort: revokes the refresh-token session on the server. */
export async function logout() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return;
  await api.post('/auth/logout', { refreshToken } satisfies Api.RefreshRequest, publicCall);
}

/** Uploads a JPG/PNG/WebP (up to 2 MB) picked on this phone as the profile photo. */
export async function uploadAvatar(file: { uri: string; mimeType?: string | null }) {
  const type = file.mimeType ?? 'image/jpeg';
  const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  const form = new FormData();
  // React Native's FormData takes a { uri, name, type } descriptor in place of a Blob.
  form.append('file', { uri: file.uri, name: `avatar.${extension}`, type } as unknown as Blob);
  const { data } = await api.post<Api.User>('/auth/me/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return data;
}

export async function removeAvatar() {
  const { data } = await api.delete<Api.User>('/auth/me/avatar');
  return data;
}
