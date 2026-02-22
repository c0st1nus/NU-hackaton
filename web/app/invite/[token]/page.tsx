"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { LanguageSwitcher } from "../../../components/language-switcher";
import { useI18n } from "../../../dictionaries/i18n";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { t } = useI18n();
  const unwrappedParams = use(params);
  const token = unwrappedParams.token;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post<{
        success?: boolean;
        user?: any;
        error?: string;
      }>("/auth/invite/accept", {
        token,
        name,
        email,
        password,
      });

      if (res.error) {
        setError(res.error);
        return;
      }

      if (res.success && res.user) {
        login(res.user);
        router.push("/dashboard");
      }
    } catch (_e: any) {
      setError("Failed to accept invite");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-foreground">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          {t.auth.acceptInvite}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          {t.auth.joinWorkspace}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <LanguageSwitcher />
        <div className="bg-card py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-border">


          <form className="space-y-6" onSubmit={handleAcceptInvite}>
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-300"
              >
                {t.auth.name}
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-blue-900/40 rounded-md shadow-sm bg-background placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-foreground"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300"
              >
                {t.auth.email}
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-blue-900/40 rounded-md shadow-sm bg-background placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-foreground"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300"
              >
                {t.auth.password}
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-blue-900/40 rounded-md shadow-sm bg-background placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-foreground"
                />
              </div>
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t.auth.acceptAndRegister}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
