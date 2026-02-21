"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { GoogleLoginButton } from "../login/google-button";
import { useI18n } from "../../dictionaries/i18n";
import { LanguageSwitcher } from "../components/language-switcher";

export default function RegisterPage() {
  const { t } = useI18n();
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post<{
        success?: boolean;
        user?: any;
        error?: string;
      }>("/auth/register", {
        companyName,
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
    } catch (e: any) {
      setError("Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-(--bg) flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-(--text-primary)">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-(--text-primary)">
          FIRE Routing Engine
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          {t.auth.registerTitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <LanguageSwitcher />
        <div className="bg-(--bg-card) py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-(--border)">
          <form className="space-y-6" onSubmit={handleRegister}>
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-300">
                {t.auth.companyName}
              </label>
              <div className="mt-1">
                <input
                  id="companyName"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-blue-900/40 rounded-md shadow-sm bg-(--bg) placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-(--text-primary)"
                />
              </div>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                {t.auth.name}
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-blue-900/40 rounded-md shadow-sm bg-(--bg) placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-(--text-primary)"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                {t.auth.email}
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-blue-900/40 rounded-md shadow-sm bg-(--bg) placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-(--text-primary)"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                {t.auth.password}
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-blue-900/40 rounded-md shadow-sm bg-(--bg) placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-(--text-primary)"
                />
              </div>
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t.auth.register}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-(--border)" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-(--bg-card) text-gray-400">
                  {t.auth.orWithGoogle}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <GoogleLoginButton mode="register" companyName={companyName} />
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-gray-400">
            {t.auth.hasAccount}{" "}
            <Link href="/login" className="text-blue-500 hover:text-blue-400">
              {t.auth.signIn}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
