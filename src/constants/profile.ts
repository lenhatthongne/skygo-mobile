/** Nationalities offered in the profile (ISO 3166 alpha-2), most common for SkyGo first. */
export const COUNTRIES = [
  { code: 'VN', vi: 'Việt Nam', en: 'Vietnam' },
  { code: 'US', vi: 'Hoa Kỳ', en: 'United States' },
  { code: 'GB', vi: 'Anh', en: 'United Kingdom' },
  { code: 'FR', vi: 'Pháp', en: 'France' },
  { code: 'DE', vi: 'Đức', en: 'Germany' },
  { code: 'JP', vi: 'Nhật Bản', en: 'Japan' },
  { code: 'KR', vi: 'Hàn Quốc', en: 'South Korea' },
  { code: 'CN', vi: 'Trung Quốc', en: 'China' },
  { code: 'SG', vi: 'Singapore', en: 'Singapore' },
  { code: 'TH', vi: 'Thái Lan', en: 'Thailand' },
  { code: 'AU', vi: 'Úc', en: 'Australia' },
  { code: 'CA', vi: 'Canada', en: 'Canada' },
] as const;

export const PROFILE_TITLES = ['MR', 'MRS', 'MS'] as const satisfies readonly Api.ProfileTitle[];
export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const satisfies readonly Api.Gender[];
