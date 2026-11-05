/** Route params for the OTP screen (router params are strings). */
export type OtpParams = {
  challengeId: string;
  email: string;
  purpose: Api.OtpPurpose;
  expiresAt: string;
  resendAfter: string;
};

export function toOtpParams(challenge: Api.OtpChallenge): OtpParams {
  return {
    challengeId: challenge.challengeId,
    email: challenge.email,
    purpose: challenge.purpose,
    expiresAt: challenge.expiresAt,
    resendAfter: String(challenge.resendAfterSeconds),
  };
}
