"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const navItems = [
    { href: "/dashboard", icon: Home, label: t.nav.home },
    { href: "/scan", icon: Camera, label: t.nav.scan },
    { href: "/leaderboard", icon: Trophy, label: t.nav.leaderboard },
    { href: "/profile", icon: User, label: t.nav.profile },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/50 px-2 pt-2 pb-3">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-colors"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-brand-500/15 rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}

                {item.href === "/scan" ? (
                  <div
                    className={cn(
                      "relative w-12 h-12 rounded-2xl flex items-center justify-center -mt-6 shadow-lg transition-all duration-200",
                      isActive
                        ? "bg-brand-500 shadow-brand-500/40"
                        : "bg-brand-600 hover:bg-brand-500 shadow-brand-600/30"
                    )}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                ) : (
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-colors duration-200",
                      isActive ? "text-brand-400" : "text-slate-500"
                    )}
                  />
                )}

                <span
                  className={cn(
                    "text-xs font-medium transition-colors duration-200",
                    item.href === "/scan" && "mt-1",
                    isActive ? "text-brand-400" : "text-slate-500"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
