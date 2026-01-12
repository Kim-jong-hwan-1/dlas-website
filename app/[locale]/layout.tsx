// app/[locale]/layout.tsx
import ClientLayout from '@/components/ClientLayout';
import { locales, type Locale } from '@/i18n/config';
import { notFound } from 'next/navigation';

// 정적 params 생성 (빌드 시 모든 locale 페이지 생성)
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  // 유효하지 않은 locale이면 404
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return (
    <ClientLayout locale={locale as Locale}>
      {children}
    </ClientLayout>
  );
}
