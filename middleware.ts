import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 국가 코드 → 언어 매핑
const countryToLang: Record<string, string> = {
  // 한국
  KR: 'ko',
  // 일본
  JP: 'ja',
  // 스페인어권 국가들
  ES: 'es', // 스페인
  MX: 'es', // 멕시코
  AR: 'es', // 아르헨티나
  CO: 'es', // 콜롬비아
  CL: 'es', // 칠레
  PE: 'es', // 페루
  VE: 'es', // 베네수엘라
  EC: 'es', // 에콰도르
  GT: 'es', // 과테말라
  CU: 'es', // 쿠바
  BO: 'es', // 볼리비아
  DO: 'es', // 도미니카공화국
  HN: 'es', // 온두라스
  PY: 'es', // 파라과이
  SV: 'es', // 엘살바도르
  NI: 'es', // 니카라과
  CR: 'es', // 코스타리카
  PA: 'es', // 파나마
  PR: 'es', // 푸에르토리코
  UY: 'es', // 우루과이
};

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 이미 언어가 설정되어 있으면 스킵
  const existingLang = request.cookies.get('DLAS_LANG')?.value;
  if (existingLang) {
    return response;
  }

  // Vercel에서 제공하는 국가 코드 (Vercel Edge 헤더에서 가져옴)
  const country = request.headers.get('x-vercel-ip-country') || 'US';

  // 국가에 맞는 언어 결정 (기본값: 영어)
  const lang = countryToLang[country] || 'en';

  // 쿠키에 언어 저장 (1년)
  response.cookies.set('DLAS_LANG', lang, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });

  return response;
}

export const config = {
  matcher: [
    // 정적 파일과 API 제외
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};
