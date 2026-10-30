import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(paise: number | bigint): string {
  const rupees = Number(paise) / 100;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rupees);
}

// ── Printed dates (DESIGN.md: dates are printed, uppercase, e.g. "05 SEP 2026") ──
// Locale-independent so server and browser render identically (no "Sept").
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const toDate = (d: string | Date) => {
  if (d instanceof Date) return d;
  // Bare YYYY-MM-DD is a calendar date — read it as local, not UTC midnight.
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`) : new Date(d);
};

/** "05 SEP 2026" */
export function formatDateShort(d: string | Date): string {
  const x = toDate(d);
  if (isNaN(x.getTime())) return '—';
  return `${String(x.getDate()).padStart(2, '0')} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
}
/** "05 SEP" — when the year is obvious from context. */
export function formatDayMonth(d: string | Date): string {
  const x = toDate(d);
  if (isNaN(x.getTime())) return '—';
  return `${String(x.getDate()).padStart(2, '0')} ${MONTHS[x.getMonth()]}`;
}
/** "SUN 03 JAN" — day headers. */
export function formatWeekdayDate(d: string | Date): string {
  const x = toDate(d);
  if (isNaN(x.getTime())) return '—';
  return `${WEEKDAYS[x.getDay()]} ${formatDayMonth(x)}`;
}
/** "10 DEC → 13 DEC 2026" (year shown once when shared). */
export function formatDateRange(a: string | Date, b: string | Date): string {
  const x = toDate(a), y = toDate(b);
  if (isNaN(x.getTime()) || isNaN(y.getTime())) return '—';
  return x.getFullYear() === y.getFullYear() ? `${formatDayMonth(x)} → ${formatDateShort(y)}` : `${formatDateShort(x)} → ${formatDateShort(y)}`;
}

/** Opens the native calendar for a date input styled as invisible over a printed
 *  date. Without this Chrome only focuses the field and the picker never shows. */
export function openDatePicker(e: { currentTarget: HTMLInputElement }) {
  try { e.currentTarget.showPicker?.(); } catch { /* unsupported or not a user gesture */ }
}
