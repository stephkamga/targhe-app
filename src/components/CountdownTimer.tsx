"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      
      const diff = midnight.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ hours, minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const urgency = timeLeft.hours < 2;

  return (
    <div className={`glass-card p-4 ${urgency ? "border-orange-500/30 bg-orange-500/5" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${urgency ? "text-orange-400" : "text-brand-400"}`} />
          <span className="text-sm font-medium text-slate-300">
            Fine giornata tra
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono">
          {[
            { value: timeLeft.hours, label: "h" },
            { value: timeLeft.minutes, label: "m" },
            { value: timeLeft.seconds, label: "s" },
          ].map((unit, i) => (
            <span key={unit.label} className="flex items-center">
              {i > 0 && <span className="text-slate-600 mx-0.5">:</span>}
              <span
                className={`text-lg font-bold tabular-nums ${
                  urgency ? "text-orange-400" : "text-white"
                }`}
              >
                {pad(unit.value)}
              </span>
              <span className="text-xs text-slate-500 ml-0.5">{unit.label}</span>
            </span>
          ))}
        </div>
      </div>
      {urgency && (
        <p className="text-xs text-orange-400/80 mt-1.5">
          ⚡ Meno di 2 ore al verdetto!
        </p>
      )}
    </div>
  );
}
