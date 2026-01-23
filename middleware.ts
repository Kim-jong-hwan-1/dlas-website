import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 지원 locale 목록
const locales = ['kr', 'en', 'jp', 'es', 'ru'] as const;
type Locale = (typeof locales)[number];

const defaultLocale: Locale = 'en';

// 국가 코드 → locale 매핑
const countryToLocale: Record<string, Locale> = {
  // 한국
  KR: 'kr',
  // 일본
  JP: 'jp',
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
  // 러시아어권
  RU: 'ru',
  BY: 'ru',
  KZ: 'ru',
  KG: 'ru',
  TJ: 'ru',
  UZ: 'ru',
};

// pathname에서 locale 추출
function getLocaleFromPathname(pathname: string): Locale | null {
  const segments = pathname.split('/');
  const firstSegment = segments[1];
  if (locales.includes(firstSegment as Locale)) {
    return firstSegment as Locale;
  }
  return null;
}

// pathname에 locale이 없는지 확인
function pathnameIsMissingLocale(pathname: string): boolean {
  return locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 정적 파일, API, _next 등은 스킵
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // 정적 파일 (.js, .css, .png 등)
  ) {
    return NextResponse.next();
  }

  // IP 기반 국가 코드 가져오기
  const country = request.headers.get('x-vercel-ip-country') || 'US';

  // pathname에 locale이 없으면 리다이렉트
  if (pathnameIsMissingLocale(pathname)) {
    // IP 기반 locale 결정
    const detectedLocale = countryToLocale[country] || defaultLocale;

    // 새 URL 생성
    const newUrl = new URL(`/${detectedLocale}${pathname}`, request.url);
    newUrl.search = request.nextUrl.search; // 쿼리 파라미터 유지

    // 리다이렉트
    return NextResponse.redirect(newUrl);
  }

  // locale이 있는 경우, 해당 locale을 쿠키에 저장
  const currentLocale = getLocaleFromPathname(pathname);
  const response = NextResponse.next();

  if (currentLocale) {
    // 언어 쿠키 저장
    response.cookies.set('DLAS_LANG', currentLocale, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }

  // 국가 코드 쿠키 저장 (결제 시스템용)
  response.cookies.set('DLAS_COUNTRY', country, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });

  return response;
}

export const config = {
  matcher: [
    // 모든 경로에 적용 (정적 파일 제외는 middleware 내부에서 처리)
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
