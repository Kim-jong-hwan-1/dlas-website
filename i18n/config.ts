// i18n/config.ts
export const locales = ['ko', 'en', 'ja', 'es'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ko';

// 국가 코드 → locale 매핑 (IP 기반 감지용)
export const countryToLocale: Record<string, Locale> = {
  // 한국
  KR: 'ko',
  // 일본
  JP: 'ja',
  // 스페인어권
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  VE: 'es',
  EC: 'es',
  GT: 'es',
  CU: 'es',
  BO: 'es',
  DO: 'es',
  HN: 'es',
  PY: 'es',
  SV: 'es',
  NI: 'es',
  CR: 'es',
  PA: 'es',
  PR: 'es',
  UY: 'es',
};

// locale → html lang 속성
export const localeToHtmlLang: Record<Locale, string> = {
  ko: 'ko',
  en: 'en',
  ja: 'ja',
  es: 'es',
};
