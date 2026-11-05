declare namespace Api {
  type Role = 'CUSTOMER' | 'ADMIN';
  type OtpPurpose = 'REGISTER' | 'LOGIN' | 'PASSWORD_RESET';

  interface User {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    role: Role;
    emailVerified: boolean;
    /** Path such as `/api/avatars/<uuid>.jpg` (relative to the server), or null. */
    avatarUrl?: string | null;
    title?: ProfileTitle | null;
    /** ISO date (YYYY-MM-DD). */
    dateOfBirth?: string | null;
    gender?: Gender | null;
    /** ISO 3166 alpha-2, e.g. VN. */
    nationality?: string | null;
    emergencyName?: string | null;
    emergencyPhone?: string | null;
    loyaltyProgram?: string | null;
    loyaltyNumber?: string | null;
    address?: string | null;
    invoiceCompany?: string | null;
    invoiceTaxCode?: string | null;
    invoiceAddress?: string | null;
  }

  type ProfileTitle = 'MR' | 'MRS' | 'MS';
  type Gender = 'MALE' | 'FEMALE' | 'OTHER';

  interface AuthSession {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    role: Role;
    user: User;
    /** Present only for CUSTOMER sessions. */
    refreshToken: string | null;
    refreshExpiresIn: number | null;
  }

  interface OtpChallenge {
    challengeId: string;
    email: string;
    purpose: OtpPurpose;
    expiresAt: string;
    resendAfterSeconds: number;
  }

  interface RegisterRequest {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }

  interface LoginRequest {
    email: string;
    password: string;
  }

  interface VerifyOtpRequest {
    challengeId: string;
    code: string;
  }

  interface ResendOtpRequest {
    challengeId: string;
  }

  interface ForgotPasswordRequest {
    email: string;
  }

  interface ResetPasswordRequest {
    challengeId: string;
    code: string;
    newPassword: string;
  }

  interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
  }

  interface UpdateProfileRequest {
    fullName: string;
    /** Backend format: optional "+" then 9-14 digits. */
    phone: string;
    /** The rest replaces the stored profile: leave a field out to clear it. */
    title?: ProfileTitle;
    dateOfBirth?: string;
    gender?: Gender;
    nationality?: string;
    emergencyName?: string;
    emergencyPhone?: string;
    loyaltyProgram?: string;
    loyaltyNumber?: string;
    address?: string;
    invoiceCompany?: string;
    invoiceTaxCode?: string;
    invoiceAddress?: string;
  }

  interface RefreshRequest {
    refreshToken: string;
  }
}
