"use client";

import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, availableLocales } = useI18n();

  return (
    <div className={cn("flex items-center gap-1 glass-card p-1", className)}>
      {availableLocales.map((l) => (
        <button
          key={l.code}
          onClick={() => setLocale(l.code)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200",
            locale === l.code
              ? "bg-brand-500 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
          )}
          title={l.label}
        >
          <span>{l.flag}</span>
          <span className="hidden sm:inline">{l.label}</span>
          <span className="sm:hidden uppercase">{l.code}</span>
        </button>
      ))}
    </div>
  );
}
