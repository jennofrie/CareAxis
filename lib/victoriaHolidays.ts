/**
 * Victoria (Australia) Public Holidays
 * Used for penalty rate calculations in roster/timesheet analysis
 */

// Format: "YYYY-MM-DD"
export const VICTORIA_PUBLIC_HOLIDAYS_2024: string[] = [
  "2024-01-01", // New Year's Day
  "2024-01-26", // Australia Day
  "2024-03-11", // Labour Day (Vic)
  "2024-03-29", // Good Friday
  "2024-03-30", // Easter Saturday
  "2024-03-31", // Easter Sunday
  "2024-04-01", // Easter Monday
  "2024-04-25", // Anzac Day
  "2024-06-10", // King's Birthday (Vic)
  "2024-09-27", // Friday before AFL Grand Final (Vic)
  "2024-11-05", // Melbourne Cup Day (metro Vic)
  "2024-12-25", // Christmas Day
  "2024-12-26", // Boxing Day
];

export const VICTORIA_PUBLIC_HOLIDAYS_2025: string[] = [
  "2025-01-01", // New Year's Day
  "2025-01-27", // Australia Day (observed)
  "2025-03-10", // Labour Day (Vic)
  "2025-04-18", // Good Friday
  "2025-04-19", // Easter Saturday
  "2025-04-20", // Easter Sunday
  "2025-04-21", // Easter Monday
  "2025-04-25", // Anzac Day
  "2025-06-09", // King's Birthday (Vic)
  "2025-09-26", // Friday before AFL Grand Final (Vic - approximate)
  "2025-11-04", // Melbourne Cup Day (metro Vic)
  "2025-12-25", // Christmas Day
  "2025-12-26", // Boxing Day
];

export const VICTORIA_PUBLIC_HOLIDAYS_2026: string[] = [
  "2026-01-01", // New Year's Day
  "2026-01-26", // Australia Day
  "2026-03-09", // Labour Day (Vic)
  "2026-04-03", // Good Friday
  "2026-04-04", // Easter Saturday
  "2026-04-05", // Easter Sunday
  "2026-04-06", // Easter Monday
  "2026-04-25", // Anzac Day
  "2026-06-08", // King's Birthday (Vic)
  "2026-11-03", // Melbourne Cup Day (metro Vic)
  "2026-12-25", // Christmas Day
  "2026-12-28", // Boxing Day (observed)
];

const ALL_HOLIDAYS = new Set([
  ...VICTORIA_PUBLIC_HOLIDAYS_2024,
  ...VICTORIA_PUBLIC_HOLIDAYS_2025,
  ...VICTORIA_PUBLIC_HOLIDAYS_2026,
]);

/** Check if a date string (YYYY-MM-DD) is a Victoria public holiday */
export function isPublicHoliday(dateStr: string): boolean {
  return ALL_HOLIDAYS.has(dateStr.slice(0, 10));
}

/** Check if a date is a weekend (Saturday or Sunday) */
export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  return d.getDay() === 0 || d.getDay() === 6;
}

/** Check if an hour falls in the evening penalty window (8pm–midnight) */
export function isEveningHour(hour: number): boolean {
  return hour >= 20 || hour < 0;
}

// ─── NDIS Support Worker Penalty Multipliers ────────────────────────────────
export const PENALTY_RATES = {
  weekday: 1.0,
  saturday: 1.25,
  sunday: 1.35,
  publicHoliday: 2.25,
  eveningWeekday: 1.15, // after 8pm weekday
};

export interface ShiftPenaltyResult {
  baseRate: number;
  adjustedRate: number;
  multiplier: number;
  dayType: "weekday" | "saturday" | "sunday" | "public-holiday";
  isEvening: boolean;
  penaltyCost: number;
  baseCost: number;
}

/**
 * Calculate penalty rate for a shift
 * @param dateStr YYYY-MM-DD
 * @param hours shift duration in hours
 * @param baseHourlyRate base hourly rate
 * @param startHour hour of day shift starts (0-23), optional
 */
export function calculateShiftPenalty(
  dateStr: string,
  hours: number,
  baseHourlyRate: number,
  startHour?: number
): ShiftPenaltyResult {
  let multiplier = PENALTY_RATES.weekday;
  let dayType: ShiftPenaltyResult["dayType"] = "weekday";

  if (isPublicHoliday(dateStr)) {
    multiplier = PENALTY_RATES.publicHoliday;
    dayType = "public-holiday";
  } else if (isWeekend(dateStr)) {
    const d = new Date(dateStr + "T00:00:00");
    if (d.getDay() === 6) {
      multiplier = PENALTY_RATES.saturday;
      dayType = "saturday";
    } else {
      multiplier = PENALTY_RATES.sunday;
      dayType = "sunday";
    }
  } else if (startHour !== undefined && isEveningHour(startHour)) {
    multiplier = PENALTY_RATES.eveningWeekday;
  }

  const isEvening = startHour !== undefined && isEveningHour(startHour) && dayType === "weekday";
  const adjustedRate = baseHourlyRate * multiplier;
  const baseCost = baseHourlyRate * hours;
  const penaltyCost = adjustedRate * hours;

  return { baseRate: baseHourlyRate, adjustedRate, multiplier, dayType, isEvening, penaltyCost, baseCost };
}

/**
 * Parse CSV roster rows and compute penalty stats
 */
export interface RosterRow {
  date: string;
  workerName: string;
  category: string;
  hours: number;
  hourlyRate: number;
}

export interface PenaltyStats {
  totalShifts: number;
  weekdayShifts: number;
  saturdayShifts: number;
  sundayShifts: number;
  publicHolidayShifts: number;
  weekdayHours: number;
  saturdayHours: number;
  sundayHours: number;
  publicHolidayHours: number;
  baseTotalCost: number;
  adjustedTotalCost: number;
  penaltyPremium: number;
}

export function computePenaltyStats(rows: RosterRow[]): PenaltyStats {
  const stats: PenaltyStats = {
    totalShifts: rows.length,
    weekdayShifts: 0, saturdayShifts: 0, sundayShifts: 0, publicHolidayShifts: 0,
    weekdayHours: 0, saturdayHours: 0, sundayHours: 0, publicHolidayHours: 0,
    baseTotalCost: 0, adjustedTotalCost: 0, penaltyPremium: 0,
  };

  for (const row of rows) {
    const penalty = calculateShiftPenalty(row.date, row.hours, row.hourlyRate);
    stats.baseTotalCost += penalty.baseCost;
    stats.adjustedTotalCost += penalty.penaltyCost;

    switch (penalty.dayType) {
      case "weekday":
        stats.weekdayShifts++;
        stats.weekdayHours += row.hours;
        break;
      case "saturday":
        stats.saturdayShifts++;
        stats.saturdayHours += row.hours;
        break;
      case "sunday":
        stats.sundayShifts++;
        stats.sundayHours += row.hours;
        break;
      case "public-holiday":
        stats.publicHolidayShifts++;
        stats.publicHolidayHours += row.hours;
        break;
    }
  }

  stats.penaltyPremium = stats.adjustedTotalCost - stats.baseTotalCost;
  return stats;
}

/**
 * Parse a roster CSV string into RosterRow[]
 * Handles the standard CareAxis CSV template format
 */
export function parseRosterCSV(csvContent: string): RosterRow[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: RosterRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 4) continue;

    const dateIdx = headers.findIndex((h) => h.includes("date"));
    const workerIdx = headers.findIndex((h) => h.includes("worker"));
    const categoryIdx = headers.findIndex((h) => h.includes("category"));
    const hoursIdx = headers.findIndex((h) => h.includes("hour") && !h.includes("rate"));
    const rateIdx = headers.findIndex((h) => h.includes("rate"));

    const date = cols[dateIdx >= 0 ? dateIdx : 0] || "";
    const workerName = cols[workerIdx >= 0 ? workerIdx : 1] || "";
    const category = cols[categoryIdx >= 0 ? categoryIdx : 2] || "";
    const hours = parseFloat(cols[hoursIdx >= 0 ? hoursIdx : 3]) || 0;
    const hourlyRate = parseFloat(cols[rateIdx >= 0 ? rateIdx : 4]) || 0;

    if (date && hours > 0) {
      rows.push({ date, workerName, category, hours, hourlyRate });
    }
  }

  return rows;
}
