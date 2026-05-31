"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Crown, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlateCardProps {
  plate: {
    id: string;
    plateNumber: string;
    photoUrl: string;
    carYear: number | null;
    createdAt: string;
    user: {
      id: string;
      name: string;
      avatar: string | null;
    };
  };
  rank?: number;
  showUser?: boolean;
  compact?: boolean;
}

export function PlateCard({
  plate,
  rank,
  showUser = true,
  compact = false,
}: PlateCardProps) {
  const isFirst = rank === 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "glass-card overflow-hidden",
        isFirst && "border-yellow-500/30 bg-yellow-500/5"
      )}
    >
      <div className="flex items-stretch">
        {/* Foto */}
        <div className="relative w-24 h-20 flex-shrink-0 bg-slate-800">
          {plate.photoUrl ? (
            <Image
              src={plate.photoUrl}
              alt={`Targa ${plate.plateNumber}`}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-slate-600 text-xs">No foto</span>
            </div>
          )}
          {rank && (
            <div
              className={cn(
                "absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                isFirst
                  ? "bg-yellow-400 text-slate-900"
                  : "bg-slate-900/80 text-slate-300"
              )}
            >
              {isFirst ? <Crown className="w-3 h-3" /> : rank}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 p-3 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="plate-badge text-sm">
              {plate.plateNumber}
            </span>
            {plate.carYear && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="w-3 h-3" />
                <span>{plate.carYear}</span>
              </div>
            )}
          </div>

          {showUser && (
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-bold border border-brand-500/30">
                {plate.user.name[0].toUpperCase()}
              </div>
              <span className="text-xs text-slate-400 truncate">
                {plate.user.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
