"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useAuth(requireAuth = true) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (requireAuth && status === "unauthenticated") {
      router.push("/login");
    }
  }, [requireAuth, status, router]);

  return {
    session,
    status,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    user: session?.user
      ? {
          ...session.user,
          id: (session.user as any).id,
          role: (session.user as any).role,
          tenantId: (session.user as any).tenantId,
          avatarUrl: (session.user as any).avatarUrl,
        }
      : null,
  };
}

export function useRole() {
  const { user } = useAuth();
  return (user as any)?.role as string | undefined;
}

export function hasPermission(role: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(role);
}
