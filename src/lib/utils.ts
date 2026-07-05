import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Stima l'anno di immatricolazione di un'auto italiana dalla targa.
 * 
 * Formato attuale (dal 1994): AA 000 AA
 * Le lettere iniziali seguono una progressione alfabetica che permette
 * di stimare l'anno approssimativo.
 * 
 * Formato vecchio (1985-1994): AA 00000 (provincia + numero)
 * Formato storico (pre-1985): vari formati provinciali
 */
export function estimateCarYearFromPlate(plate: string): number | null {
  const cleaned = plate.replace(/\s/g, "").toUpperCase();

  // Formato attuale: 2 lettere + 3 cifre + 2 lettere (es. AB123CD)
  const modernFormat = /^([A-Z]{2})(\d{3})([A-Z]{2})$/;
  const match = cleaned.match(modernFormat);

  if (match) {
    const prefix = match[1];
    const suffix = match[3];
    return estimateYearFromModernPlate(prefix, suffix);
  }

  // Formato vecchio provinciale (es. MI 12345 o MI123456)
  const oldFormat = /^([A-Z]{2})(\d{4,6})$/;
  const oldMatch = cleaned.match(oldFormat);
  if (oldMatch) {
    // Targhe provinciali: stima generica anni 1970-1994
    return estimateYearFromOldPlate(oldMatch[1], parseInt(oldMatch[2]));
  }

  // Formato storico (es. MI 1234) - pre 1970
  const historicFormat = /^([A-Z]{2})(\d{1,4})$/;
  const historicMatch = cleaned.match(historicFormat);
  if (historicMatch) {
    return 1960; // Stima generica per targhe storiche
  }

  return null;
}

/**
 * Stima l'anno per targhe nel formato moderno (AA 000 AA).
 *
 * Lookup table calibrata su anchor point reali (fonte: praticheauto.online, ACI):
 *   FJ (index 118) → 2017
 *   GF (index 137) → 2021
 *   GV (index 150) → 2023/2024
 *
 * Alfabeto: ABCDEFGHJKLMNPRSTUVWXYZ (23 lettere, senza I, O, Q, U)
 * Indice prefisso: AA=0, AB=1 ... ZZ=528
 */
function estimateYearFromModernPlate(prefix: string, _suffix: string): number {
  const ALPHABET = "ABCDEFGHJKLMNPRSTUVWXYZ"; // 23 lettere
  const N = ALPHABET.length; // 23

  const p1 = ALPHABET.indexOf(prefix[0]);
  const p2 = ALPHABET.indexOf(prefix[1]);

  if (p1 === -1 || p2 === -1) return 1994;

  const prefixIndex = p1 * N + p2;

  // Lookup table [anno, indice prefisso iniziale]
  // Anchor reali verificati (alfabeto 23 lettere, N=23):
  //   FJ = F(5)*23 + J(8) = 123 → 2017
  //   GF = G(6)*23 + F(5) = 143 → 2021
  //   GV = G(6)*23 + V(19) = 156 → 2023
  const YEAR_TABLE: [number, number][] = [
    [1994,   0],
    [1995,   5],
    [1996,  11],
    [1997,  16],
    [1998,  22],
    [1999,  28],
    [2000,  34],
    [2001,  40],
    [2002,  46],
    [2003,  52],
    [2004,  58],
    [2005,  64],
    [2006,  70],
    [2007,  76],
    [2008,  82],
    [2009,  88],
    [2010,  94],
    [2011, 100],
    [2012, 106],
    [2013, 110],
    [2014, 114],
    [2015, 118],
    [2016, 121],
    [2017, 123],  // ✅ FJ=123 verificato
    [2018, 128],
    [2019, 133],
    [2020, 138],  // COVID
    [2021, 143],  // ✅ GF=143 verificato
    [2022, 150],
    [2023, 156],  // ✅ GV=156 verificato
    [2024, 162],
    [2025, 168],
    [2026, 174],
  ];

  for (let i = 0; i < YEAR_TABLE.length - 1; i++) {
    const [year, startIdx] = YEAR_TABLE[i];
    const [nextYear, nextIdx] = YEAR_TABLE[i + 1];

    if (prefixIndex >= startIdx && prefixIndex < nextIdx) {
      const fraction = (prefixIndex - startIdx) / (nextIdx - startIdx);
      return Math.round(year + fraction * (nextYear - year));
    }
  }

  return YEAR_TABLE[YEAR_TABLE.length - 1][0];
}

/**
 * Stima l'anno per targhe provinciali vecchie
 */
function estimateYearFromOldPlate(province: string, number: number): number {
  // Stima molto approssimativa basata sul numero progressivo
  if (number < 10000) return 1970;
  if (number < 50000) return 1978;
  if (number < 100000) return 1985;
  return 1990;
}

/**
 * Valida il formato di una targa italiana
 */
export function isValidItalianPlate(plate: string): boolean {
  const cleaned = plate.replace(/\s/g, "").toUpperCase();
  
  // Formato moderno: AA 000 AA
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(cleaned)) return true;
  
  // Formato vecchio provinciale
  if (/^[A-Z]{2}\d{4,6}$/.test(cleaned)) return true;
  
  // Targhe speciali (EE, CC, CD, etc.)
  if (/^(EE|CC|CD|SX|EP|X)\d+$/.test(cleaned)) return true;
  
  return false;
}

/**
 * Formatta una targa nel formato standard italiano
 */
export function formatPlate(plate: string): string {
  const cleaned = plate.replace(/\s/g, "").toUpperCase();
  
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(cleaned)) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
  }
  
  return cleaned;
}

/**
 * Formatta una data in italiano
 */
export function formatDateIT(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Restituisce la data di oggi come stringa YYYY-MM-DD
 */
export function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Controlla se una data è oggi
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}
