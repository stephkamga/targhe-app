import { BadgeType } from "@prisma/client";

export type { BadgeType };

export interface PlateWithUser {
  id: string;
  plateNumber: string;
  photoUrl: string;
  carYear: number | null;
  notes: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface DailyWinWithUser {
  id: string;
  date: Date;
  plateNumber: string;
  carYear: number;
  photoUrl: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface UserStats {
  totalPlates: number;
  totalWins: number;
  badges: BadgeInfo[];
  todayPlates: number;
  remainingToday: number;
}

export interface BadgeInfo {
  id: string;
  type: BadgeType;
  earnedAt: Date;
  description: string | null;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar: string | null;
  totalWins: number;
  totalPlates: number;
  latestWinDate: Date | null;
}

export interface SubmitPlateData {
  plateNumber: string;
  photoBase64: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// Estendi il tipo Session di NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}
