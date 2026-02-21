"use client";

import { useI18n } from "../../dictionaries/i18n";

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex justify-center gap-4 mb-8">
      {(["ru", "en", "kz"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`px-3 py-1 text-xs font-bold rounded border ${
            lang === l
              ? "bg-blue-600 border-blue-500 text-white"
              : "bg-(--bg-card) border-(--border) text-(--text-secondary) hover:border-gray-500"
          } transition-all`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
