import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - ObrasAWC",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
