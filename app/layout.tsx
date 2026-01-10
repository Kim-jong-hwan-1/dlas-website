// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

// layout.tsx는 기본적으로 서버 컴포넌트
// -> "use client"를 붙이지 마세요

import ClientLayout from '@/components/ClientLayout';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'DLAS',
  description: 'Dental Lab Automation Solution',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen font-sans`}
        style={{ backgroundColor: '#1a1a1f' }}
      >
        {/*
          서버 컴포넌트인 layout에서
          클라이언트 컴포넌트(ClientLayout)를 감싸면,
          그 내부에서 LanguageWrapper를 적용할 수 있음
        */}
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
