import type { Metadata } from 'next';
import { Inter, Barlow_Condensed } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/auth-provider';
import { Toaster } from '@/components/ui/toaster';
import { CookieNotice } from '@/components/legal/cookie-notice';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const barlow = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
});

export const metadata: Metadata = {
  title: 'RIGOR - Sistema de Gestão de Obras',
  description: 'RIGOR - Gestão profissional de obras, equipes, custos e resultados',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${barlow.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
          <CookieNotice />
        </AuthProvider>
      </body>
    </html>
  );
}
