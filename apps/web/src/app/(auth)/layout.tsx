import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Entrar - RIGOR',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
