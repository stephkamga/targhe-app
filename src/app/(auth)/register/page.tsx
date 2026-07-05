"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Car, Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordStrength = (() => {
    if (password.length === 0) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthColors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];
  const strengthLabels = ["", t.register.strengthWeak, t.register.strengthFair, t.register.strengthGood, t.register.strengthStrong];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t.register.errorRegistration);
        return;
      }
      const loginResult = await signIn("credentials", { email, password, redirect: false });
      if (loginResult?.error) {
        toast.error(t.register.successAfterRegister);
        router.push("/login");
      } else {
        toast.success(t.register.successRegister);
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error(t.register.errorConnection);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-brand-500/20 rounded-2xl mb-4 border border-brand-500/30"
          >
            <Car className="w-8 h-8 text-brand-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white">{t.register.title}</h1>
          <p className="text-slate-400 text-sm mt-1">{t.register.subtitle}</p>
        </div>

        <div className="glass-card p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">{t.register.nameLabel}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder={t.register.namePlaceholder} className="input-field pl-10" required autoComplete="name" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">{t.register.emailLabel}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.register.emailPlaceholder} className="input-field pl-10" required autoComplete="email" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">{t.register.passwordLabel}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder={t.register.passwordPlaceholder}
                  className="input-field pl-10 pr-10" required minLength={8} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength ? strengthColors[passwordStrength] : "bg-slate-700"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">
                    {t.register.strengthLabel}{" "}
                    <span className={`font-medium ${passwordStrength >= 3 ? "text-green-400" : passwordStrength >= 2 ? "text-yellow-400" : "text-red-400"}`}>
                      {strengthLabels[passwordStrength]}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 text-center">{t.register.terms}</p>

            <button type="submit" disabled={loading || password.length < 8} className="btn-primary w-full">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t.register.loading}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {t.register.submitButton} <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-400 text-sm mt-6">
          {t.register.hasAccount}{" "}
          <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            {t.register.loginLink}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
