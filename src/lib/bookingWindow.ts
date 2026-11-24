export const BOOKING_WINDOWS_IST = [
  { label: '10:00 AM – 4:00 PM', startMinutes: 10 * 60, endMinutes: 16 * 60 },
  { label: '6:30 PM – 11:00 PM', startMinutes: 18 * 60 + 30, endMinutes: 23 * 60 },
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

export function isTokenBookingOpenIST(date: Date = new Date()): boolean {
  const mins = getISTMinutesOfDay(date);
  return BOOKING_WINDOWS_IST.some(
    (win) => mins >= win.startMinutes && mins <= win.endMinutes
  );
}

export function getBookingWindowStatusText(date: Date = new Date()): string {
  if (isTokenBookingOpenIST(date)) {
    return 'Token booking is open (10:00 AM – 4:00 PM & 6:30 PM – 11:00 PM IST).';
  }
  return 'Token booking is open only between 10:00 AM – 4:00 PM and 6:30 PM – 11:00 PM IST.';
}
