"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import {
  LogOut,
  Trophy,
  Car,
  Star,
  Shield,
  Flame,
  Zap,
  Clock,
  Award,
} from "lucide-react";
import { BadgeType } from "@/types";
import { PlateCard } from "@/components/PlateCard";

interface UserStats {
  totalPlates: number;
  totalWins: number;
  badges: Array<{
    id: string;
    type: BadgeType;
    earnedAt: string;
    description: string | null;
  }>;
  todayPlates: number;
  remainingToday: number;
}

const BADGE_CONFIG: Record<
  BadgeType,
  { icon: React.ElementType; label: string; color: string; bg: string }
> = {
  FIRST_PLATE: {
    icon: Car,
    label: "Prima targa",
    color: "text-brand-400",
    bg: "bg-brand-500/20",
  },
  DAILY_WINNER: {
    icon: Trophy,
    label: "Vincitore del giorno",
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
  },
  STREAK_3: {
    icon: Flame,
    label: "3 vittorie di fila",
    color: "text-orange-400",
    bg: "bg-orange-500/20",
  },
  STREAK_7: {
    icon: Zap,
    label: "7 vittorie di fila",
    color: "text-violet-400",
    bg: "bg-violet-500/20",
  },
  VINTAGE_HUNTER: {
    icon: Clock,
    label: "Cacciatore vintage",
    color: "text-amber-400",
    bg: "bg-amber-500/20",
  },
  CENTURY_HUNTER: {
    icon: Shield,
    label: "Cacciatore del secolo",
    color: "text-emerald-400",
    bg: "bg-emerald-500/20",
  },
  COLLECTOR: {
    icon: Star,
    label: "Collezionista",
    color: "text-pink-400",
    bg: "bg-pink-500/20",
  },
};

export default function ProfilePage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [plates, setPlates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, platesRes] = await Promise.all([
          fetch("/api/user/stats"),
          fetch("/api/plates?limit=10"),
        ]);
        const [statsData, platesData] = await Promise.all([
          statsRes.json(),
          platesRes.json(),
        ]);
        setStats(statsData);
        setPlates(platesData.plates || []);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <div className="px-4 pt-6 pb-4 max-w-md mx-auto space-y-5">
      {/* Header profilo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5"
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {initials}
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">
              {session?.user?.name}
            </h1>
            <p className="text-slate-400 text-sm">{session?.user?.email}</p>
          </div>

          <button
            onClick={handleSignOut}
            className="w-9 h-9 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl flex items-center justify-center transition-colors"
            aria-label="Esci"
          >
            <LogOut className="w-4 h-4 text-red-400" />
          </button>
        </div>

        {/* Stats rapide */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-700/50">
          {[
            { label: "Targhe", value: stats?.totalPlates ?? "—", icon: Car, color: "text-brand-400" },
            { label: "Vittorie", value: stats?.totalWins ?? "—", icon: Trophy, color: "text-yellow-400" },
            { label: "Badge", value: stats?.badges?.length ?? "—", icon: Award, color: "text-violet-400" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Oggi */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4"
      >
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-400" />
          Oggi
        </h2>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center ${
                  i < (stats?.todayPlates ?? 0)
                    ? "border-brand-500 bg-brand-500/20"
                    : "border-slate-700 border-dashed"
                }`}
              >
                {i < (stats?.todayPlates ?? 0) ? (
                  <Car className="w-4 h-4 text-brand-400" />
                ) : (
                  <span className="text-slate-600 text-xs">{i + 1}</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-400">
            {stats?.remainingToday ?? 3} rimaste oggi
          </p>
        </div>
      </motion.div>

      {/* Badge */}
      {stats && stats.badges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-violet-400" />
            I tuoi badge
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {stats.badges.map((badge) => {
              const config = BADGE_CONFIG[badge.type];
              if (!config) return null;
              const Icon = config.icon;

              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-3 flex items-center gap-3"
                >
                  <div
                    className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {config.label}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(badge.earnedAt).toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Ultime targhe */}
      {plates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Car className="w-4 h-4 text-brand-400" />
            Le tue ultime targhe
          </h2>
          <div className="space-y-2">
            {plates.map((plate) => (
              <PlateCard key={plate.id} plate={plate} showUser={false} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state badge */}
      {stats && stats.badges.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 text-center"
        >
          <Award className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">
            Nessun badge ancora. Inizia a scansionare targhe!
          </p>
        </motion.div>
      )}
    </div>
  );
}
