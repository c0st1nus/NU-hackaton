"use client";

import { useAuth } from "../../lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function ProtectedGuard({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Rediect to login and optionally save the intended path
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (requireAdmin && user.role !== "ADMIN") {
        router.push("/");
      }
    }
  }, [user, loading, router, pathname, requireAdmin]);

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-full">Loading...</div>;
  }

  if (!user || (requireAdmin && user.role !== "ADMIN")) {
    return null; // Will redirect via the useEffect
  }

  return <>{children}</>;
}
