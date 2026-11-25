export type ShiftSlot = 'MORNING' | 'EVENING';

export const BOOKING_WINDOWS_IST = [
  { slot: 'MORNING' as ShiftSlot, label: '10:00 AM – 4:00 PM', startMinutes: 10 * 60, endMinutes: 16 * 60 },
  { slot: 'EVENING' as ShiftSlot, label: '6:30 PM – 11:00 PM', startMinutes: 18 * 60 + 30, endMinutes: 23 * 60 },
] as const;

export function getISTMinutesOfDay(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

export function getCurrentShiftIST(date: Date = new Date()): ShiftSlot {
  const mins = getISTMinutesOfDay(date);
  return mins < 17 * 60 ? 'MORNING' : 'EVENING';
}

export function isTokenBookingOpenIST(date: Date = new Date()): boolean {
  const mins = getISTMinutesOfDay(date);
  return BOOKING_WINDOWS_IST.some(
    (win) => mins >= win.startMinutes && mins <= win.endMinutes
  );
}

export function getBookingWindowStatusText(date: Date = new Date()): string {
  const shift = getCurrentShiftIST(date);
  const shiftLabel = shift === 'MORNING' ? 'Morning (M-#)' : 'Evening (E-#)';
  if (isTokenBookingOpenIST(date)) {
    return `${shiftLabel} token booking is open (10:00 AM – 4:00 PM & 6:30 PM – 11:00 PM IST).`;
  }
  return `Token booking is open only between 10:00 AM – 4:00 PM and 6:30 PM – 11:00 PM IST (${shiftLabel}).`;
}

export function formatShiftTokenLabel(
  tokenNumber: number,
  shiftSlot?: string | null,
  createdAt?: string
): string {
  let slot: ShiftSlot = 'EVENING';
  if (shiftSlot === 'MORNING' || shiftSlot === 'EVENING') {
    slot = shiftSlot;
  } else if (createdAt) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(createdAt));
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    slot = h * 60 + m < 17 * 60 ? 'MORNING' : 'EVENING';
  }
  const prefix = slot === 'MORNING' ? 'M' : 'E';
  return `${prefix}-${tokenNumber}`;
}
