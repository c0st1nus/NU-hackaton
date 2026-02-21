"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

declare global {
  interface Window {
    google?: any;
  }
}

export function GoogleLoginButton({
  mode = "login",
  companyName = "",
}: {
  mode?: "login" | "register";
  companyName?: string;
}) {
  const { login } = useAuth();
  const router = useRouter();
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load script dynamically to avoid SSR issues
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google?.accounts?.id && btnRef.current) {
        window.google.accounts.id.initialize({
          client_id:
            process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "PLACEHOLDER_CLIENT_ID",
          callback: async (response: any) => {
            try {
              const res = await api.post<any>("/auth/google", {
                token: response.credential,
                companyName: mode === "register" ? companyName : undefined,
              });
              if (res.success) {
                login(res.user);
                router.push("/dashboard");
              } else {
                alert(res.error || "Google Auth Failed");
              }
            } catch (e) {
              console.error("Google Auth error", e);
            }
          },
        });
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          width: "100%",
        });
      }
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [mode, companyName, login, router]);

  return <div ref={btnRef} className="w-full flex justify-center" />;
}
