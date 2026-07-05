"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Trophy, Camera, Flame, Star, ChevronRight, Clock, Car, Crown } from "lucide-react";
import Link from "next/link";
import { formatPlate } from "@/lib/utils";
import { PlateCard } from "@/components/PlateCard";
import { CountdownTimer } from "@/components/CountdownTimer";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface TodayData {
  todayPlates: any[];
  myTodayPlates: any[];
  myCount: number;
  remaining: number;
  leader: any | null;
  isLeading: boolean;
}

interface UserStats {
  totalPlates: number;
  totalWins: number;
  badges: any[];
  todayPlates: number;
  remainingToday: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [todayRes, statsRes] = await Promise.all([
          fetch("/api/plates/today"),
          fetch("/api/user/stats"),
        ]);
        const [today, userStats] = await Promise.all([todayRes.json(), statsRes.json()]);
        setTodayData(today);
        setStats(userStats);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const firstName = session?.user?.name?.split(" ")[0] || "—";

  return (
    <div className="px-4 pt-6 pb-4 max-w-md mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">{t.dashboard.greeting}</p>
          <h1 className="text-2xl font-bold text-white">{firstName} 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <div className="glass-card px-3 py-1.5 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-white">{stats?.totalWins || 0}</span>
            <span className="text-xs text-slate-400">{t.dashboard.wins}</span>
          </div>
        </div>
      </motion.div>

      {/* Countdown */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
        <CountdownTimer />
      </motion.div>

      {/* Daily status */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-400" />
            {t.dashboard.today}
          </h2>
          <span className="text-xs text-slate-400">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>

        <div className="flex gap-2 mb-4">
          {[0, 1, 2].map((i) => {
            const plate = todayData?.myTodayPlates[i];
            return (
              <div key={i} className={`flex-1 h-14 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${plate ? "border-brand-500/50 bg-brand-500/10" : "border-slate-700/50 bg-slate-800/30 border-dashed"}`}>
                {plate ? (
                  <div className="text-center">
                    <p className="text-xs font-mono font-bold text-brand-300 tracking-wider">{plate.plateNumber}</p>
                    {plate.carYear && <p className="text-xs text-slate-400">{plate.carYear}</p>}
                  </div>
                ) : (
                  <Camera className="w-5 h-5 text-slate-600" />
                )}
              </div>
            );
          })}
        </div>

        {(todayData?.remaining ?? 3) > 0 ? (
          <Link href="/scan" className="btn-primary w-full text-sm py-2.5">
            <Camera className="w-4 h-4" />
            {t.dashboard.scanCta} ({todayData?.remaining ?? 3} {t.dashboard.remaining})
          </Link>
        ) : (
          <div className="text-center py-2 text-slate-400 text-sm">{t.dashboard.allUsed}</div>
        )}
      </motion.div>

      {/* Leader */}
      {todayData?.leader && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className={`glass-card p-4 ${todayData.isLeading ? "border-yellow-500/30 bg-yellow-500/5" : ""}`}>
          <div className="flex items-center gap-2 mb-3">
            <Crown className={`w-4 h-4 ${todayData.isLeading ? "text-yellow-400" : "text-slate-400"}`} />
            <h2 className="font-semibold text-white">{todayData.isLeading ? t.dashboard.leading : t.dashboard.currentLeader}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-sm border border-brand-500/30">
              {todayData.leader.user.name[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium text-white text-sm">{todayData.leader.user.name}</p>
              <div className="flex items-center gap-2">
                <span className="plate-badge text-xs px-2 py-0.5">{todayData.leader.plateNumber}</span>
                {todayData.leader.carYear && (
                  <span className="text-xs text-slate-400">{t.dashboard.year} {todayData.leader.carYear}</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="grid grid-cols-3 gap-3">
        {[
          { label: t.dashboard.plates, value: stats?.totalPlates || 0, icon: Car, color: "text-brand-400", bg: "bg-brand-500/10" },
          { label: t.dashboard.wins, value: stats?.totalWins || 0, icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: t.dashboard.badges, value: stats?.badges?.length || 0, icon: Star, color: "text-violet-400", bg: "bg-violet-500/10" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-3 text-center">
            <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center mx-auto mb-2`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-slate-400">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Today's plates */}
      {todayData && todayData.todayPlates.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">{t.dashboard.todayPlates}</h2>
            <Link href="/leaderboard" className="text-brand-400 text-sm flex items-center gap-1">
              {t.dashboard.seeAll} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {todayData.todayPlates.slice(0, 5).map((plate, index) => (
              <PlateCard key={plate.id} plate={plate} rank={index + 1} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!loading && todayData?.todayPlates.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-8 text-center">
          <Car className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            {t.dashboard.emptyTitle}<br />{t.dashboard.emptySubtitle}
          </p>
          <Link href="/scan" className="btn-primary mt-4 inline-flex">
            <Camera className="w-4 h-4" />
            {t.dashboard.scanNow}
          </Link>
        </motion.div>
      )}
    </div>
  );
}
