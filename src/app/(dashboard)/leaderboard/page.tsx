"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Star, Calendar, Car } from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { formatDateIT } from "@/lib/utils";

interface LeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar: string | null;
  totalWins: number;
  totalPlates: number;
  latestWinDate: string | null;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  todayWin: {
    plateNumber: string;
    carYear: number;
    user: { id: string; name: string; avatar: string | null };
  } | null;
}

const rankIcons = [
  { icon: Crown, color: "text-yellow-400", bg: "bg-yellow-400/20", border: "border-yellow-400/30" },
  { icon: Medal, color: "text-slate-300", bg: "bg-slate-300/20", border: "border-slate-300/30" },
  { icon: Medal, color: "text-orange-400", bg: "bg-orange-400/20", border: "border-orange-400/30" },
];

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 pt-6 pb-4 max-w-md mx-auto space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center justify-center w-14 h-14 bg-yellow-500/20 rounded-2xl mb-3 border border-yellow-500/30">
          <Trophy className="w-7 h-7 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Classifica</h1>
        <p className="text-slate-400 text-sm mt-1">Chi ha trovato più targhe recenti</p>
      </motion.div>

      {/* Vincitore di oggi */}
      {data?.todayWin && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-yellow-400">Vincitore di oggi</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold border border-yellow-500/30">
              {data.todayWin.user.name[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-white">{data.todayWin.user.name}</p>
              <div className="flex items-center gap-2">
                <span className="plate-badge text-xs px-2 py-0.5">
                  {data.todayWin.plateNumber}
                </span>
                <span className="text-xs text-slate-400">Anno {data.todayWin.carYear}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Top 3 podio */}
      {data && data.leaderboard.length >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-end justify-center gap-3 py-4"
        >
          {/* 2° posto */}
          <PodiumItem entry={data.leaderboard[1]} rank={2} currentUserId={session?.user?.id} />
          {/* 1° posto */}
          <PodiumItem entry={data.leaderboard[0]} rank={1} currentUserId={session?.user?.id} tall />
          {/* 3° posto */}
          <PodiumItem entry={data.leaderboard[2]} rank={3} currentUserId={session?.user?.id} />
        </motion.div>
      )}

      {/* Lista completa */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
      >
        <h2 className="font-semibold text-slate-300 text-sm px-1">Classifica completa</h2>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass-card p-4 h-16 shimmer" />
            ))}
          </div>
        ) : data?.leaderboard.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Nessun vincitore ancora. Sii il primo!</p>
          </div>
        ) : (
          data?.leaderboard.map((entry, index) => {
            const isMe = entry.userId === session?.user?.id;
            const rankConfig = rankIcons[index] || null;

            return (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
                className={`glass-card p-3 flex items-center gap-3 ${
                  isMe ? "border-brand-500/30 bg-brand-500/5" : ""
                }`}
              >
                {/* Rank */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    rankConfig
                      ? `${rankConfig.bg} border ${rankConfig.border}`
                      : "bg-slate-800"
                  }`}
                >
                  {rankConfig ? (
                    <rankConfig.icon className={`w-4 h-4 ${rankConfig.color}`} />
                  ) : (
                    <span className="text-xs font-bold text-slate-400">{index + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-sm border border-brand-500/30 flex-shrink-0">
                  {entry.userName[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-white text-sm truncate">
                      {entry.userName}
                    </p>
                    {isMe && (
                      <span className="text-xs bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        Tu
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      {entry.totalPlates} targhe
                    </span>
                    {entry.latestWinDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(entry.latestWinDate).toLocaleDateString("it-IT", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Vittorie */}
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-white">{entry.totalWins}</p>
                  <p className="text-xs text-slate-400">vittorie</p>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </div>
  );
}

function PodiumItem({
  entry,
  rank,
  currentUserId,
  tall = false,
}: {
  entry: LeaderboardEntry;
  rank: number;
  currentUserId?: string;
  tall?: boolean;
}) {
  const isMe = entry.userId === currentUserId;
  const heights = { 1: "h-24", 2: "h-16", 3: "h-12" };
  const colors = {
    1: "bg-yellow-400/20 border-yellow-400/40 text-yellow-400",
    2: "bg-slate-400/20 border-slate-400/40 text-slate-300",
    3: "bg-orange-400/20 border-orange-400/40 text-orange-400",
  };

  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      {/* Avatar */}
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 ${
          isMe
            ? "bg-brand-500/30 border-brand-500 text-brand-300"
            : "bg-slate-700 border-slate-600 text-slate-300"
        }`}
      >
        {entry.userName[0].toUpperCase()}
      </div>

      {/* Nome */}
      <p className="text-xs font-medium text-slate-300 text-center truncate w-full px-1">
        {entry.userName.split(" ")[0]}
      </p>

      {/* Vittorie */}
      <p className="text-sm font-bold text-white">{entry.totalWins}</p>

      {/* Podio */}
      <div
        className={`w-full rounded-t-xl border flex items-center justify-center ${
          heights[rank as 1 | 2 | 3]
        } ${colors[rank as 1 | 2 | 3]}`}
      >
        <span className="text-xl font-black">{rank}</span>
      </div>
    </div>
  );
}
