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
 * Stima l'anno per targhe nel formato moderno (AA 000 AA)
 * La progressione inizia da AA 000 AA nel 1994.
 *
 * In Italia vengono emesse circa 1.500 combinazioni prefisso/anno.
 * L'alfabeto usato è 22 lettere (senza I, O, Q, U) → 22² = 484 prefissi totali.
 * Il suffisso cambia più velocemente: ogni prefisso copre ~1000 targhe (000-999).
 * Stima: il prefisso avanza di ~1 ogni 6-7 mesi → ~2 prefissi/anno.
 */
function estimateYearFromModernPlate(prefix: string, suffix: string): number {
  const ALPHABET = "ABCDEFGHJKLMNPRSTUVWXYZ"; // 22 lettere, senza I, O, Q, U

  const p1 = ALPHABET.indexOf(prefix[0]);
  const p2 = ALPHABET.indexOf(prefix[1]);

  if (p1 === -1 || p2 === -1) return 1994;

  // Indice del prefisso (0 = AA, 1 = AB, ..., 483 = ZZ)
  const prefixIndex = p1 * ALPHABET.length + p2;

  // In Italia dal 1994 al 2024 (30 anni) sono stati emessi ~484 prefissi
  // → circa 16 prefissi/anno in media
  const yearsFromStart = prefixIndex / 16;

  return Math.min(new Date().getFullYear(), Math.round(1994 + yearsFromStart));
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
