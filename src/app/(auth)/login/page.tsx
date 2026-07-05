"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, Mail, Lock, Eye, EyeOff, ArrowRight, Trophy, Car, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [monthly, setMonthly] = useState<{ leaderboard: { rank: number; userId: string; userName: string; wins: number }[]; month: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    fetch("/api/leaderboard/public", { signal: controller.signal })
      .then((r) => r.json())
      .then(setMonthly)
      .catch(() => setMonthly({ leaderboard: [], month: "" })) // show empty state on error/timeout
      .finally(() => clearTimeout(timeout));

    return () => controller.abort();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        toast.error(t.login.errorInvalid);
      } else {
        toast.success(t.login.successLogin);
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error(t.login.errorConnection);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { icon: Camera, label: t.login.step1, desc: t.login.step1desc, color: "text-brand-400", bg: "bg-brand-500/15" },
    { icon: Car,    label: t.login.step2, desc: t.login.step2desc, color: "text-violet-400", bg: "bg-violet-500/15" },
    { icon: Trophy, label: t.login.step3, desc: t.login.step3desc, color: "text-yellow-400", bg: "bg-yellow-500/15" },
  ];

  return (
    <div className="min-h-dvh flex flex-col px-4 py-8 overflow-y-auto">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-violet-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 bg-yellow-500/5 rounded-full blur-3xl" />
      </div>

      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm mx-auto relative flex flex-col gap-8 pt-8">

        {/* ── HERO ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-brand-500/20 rounded-3xl mb-5 border border-brand-500/30 shadow-xl shadow-brand-500/10"
          >
            <span className="text-4xl">🚗</span>
          </motion.div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            {t.login.heroTagline}
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            {t.login.heroDesc}
          </p>
        </motion.div>

        {/* ── HOW IT WORKS ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-2"
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 + i * 0.08 }}
              className="glass-card p-3 text-center flex flex-col items-center gap-2"
            >
              <div className={`w-10 h-10 ${step.bg} rounded-xl flex items-center justify-center`}>
                <step.icon className={`w-5 h-5 ${step.color}`} />
              </div>
              <p className="text-xs font-semibold text-white leading-tight">{step.label}</p>
              <p className="text-xs text-slate-500 leading-tight">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── PROOF BAR ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="flex items-center justify-center gap-2"
        >
          <div className="flex -space-x-2">
            {["🧑", "👩", "👦", "👧", "🧔"].map((emoji, i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-sm">
                {emoji}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-yellow-400" />
            {t.login.limit}
          </p>
        </motion.div>

        {/* ── MONTHLY LEADERBOARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className="glass-card p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              {t.login.monthlyTitle}
            </h3>
            {monthly?.month && (
              <span className="text-xs text-slate-500 capitalize">{monthly.month}</span>
            )}
          </div>

          {!monthly ? (
            // Loading skeleton
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-9 rounded-lg shimmer" />
              ))}
            </div>
          ) : monthly.leaderboard.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-3">{t.login.monthlyEmpty}</p>
          ) : (
            <div className="space-y-2">
              {monthly.leaderboard.map((entry) => {
                const rankEmoji = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : null;
                const isTop3 = entry.rank <= 3;
                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isTop3 ? "bg-slate-700/40" : ""}`}
                  >
                    {/* Rank */}
                    <div className="w-6 text-center flex-shrink-0">
                      {rankEmoji ? (
                        <span className="text-base">{rankEmoji}</span>
                      ) : (
                        <span className="text-xs font-bold text-slate-500">{entry.rank}</span>
                      )}
                    </div>

                    {/* Avatar initial */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      entry.rank === 1 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                      entry.rank === 2 ? "bg-slate-400/20 text-slate-300 border border-slate-400/30" :
                      entry.rank === 3 ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                      "bg-slate-700 text-slate-400"
                    }`}>
                      {entry.userName[0]?.toUpperCase()}
                    </div>

                    {/* Name */}
                    <p className={`flex-1 text-sm font-medium truncate ${entry.rank === 1 ? "text-yellow-300" : "text-slate-200"}`}>
                      {entry.userName}
                    </p>

                    {/* Wins */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`text-sm font-bold ${entry.rank === 1 ? "text-yellow-400" : "text-slate-300"}`}>
                        {entry.wins}
                      </span>
                      <span className="text-xs text-slate-500">{t.login.monthlyWins}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── PLATE EXAMPLE ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-4 flex items-center gap-4 border-yellow-500/20 bg-yellow-500/5"
        >
          <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 mb-1">🏆 Leader di oggi</p>
            <div className="flex items-center gap-2">
              <span className="plate-badge text-sm">GV 247 KL</span>
              <span className="text-xs text-slate-300 font-medium">Anno 2024</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-yellow-400">🥇</p>
          </div>
        </motion.div>

        {/* ── FORM ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-white text-center">{t.login.subtitle}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">{t.login.emailLabel}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.login.emailPlaceholder}
                    className="input-field pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">{t.login.passwordLabel}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.login.passwordPlaceholder}
                    className="input-field pl-10 pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t.login.loading}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {t.login.submitButton}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-slate-400 text-sm mt-5">
            {t.login.noAccount}{" "}
            <Link href="/register" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
              {t.login.registerLink} →
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
