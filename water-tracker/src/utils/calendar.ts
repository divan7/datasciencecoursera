export interface CalendarPlanParams {
  startDate: string;      // "YYYY-MM-DD"
  initialGlasses: number;
  finalGoalMl: number;
  glassSizeMl: number;
  wakeTime: string;
  sleepTime: string;
}

function buildSearch(p: CalendarPlanParams): string {
  return new URLSearchParams({
    t0:    p.startDate,
    ig:    String(p.initialGlasses),
    goal:  String(p.finalGoalMl),
    ml:    String(p.glassSizeMl),
    wake:  p.wakeTime,
    sleep: p.sleepTime,
  }).toString();
}

/** Returns the HTTPS URL for the ICS calendar feed (used for manual "From URL" import). */
export function getCalendarUrl(p: CalendarPlanParams): string {
  return `https://${window.location.host}/api/calendar?${buildSearch(p)}`;
}

/** Open the plan calendar.
 *  - iOS: webcal:// → Calendar.app opens and asks to subscribe
 *  - Desktop: downloads the .ics */
export function openCalendar(p: CalendarPlanParams): void {
  const search = buildSearch(p);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    window.location.href = `webcal://${window.location.host}/api/calendar?${search}`;
  } else {
    const a = document.createElement('a');
    a.href = `/api/calendar?${search}`;
    a.download = 'aquavital-plan.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/** Generates one Google Calendar event-creation URL per time slot.
 *  Each event repeats daily for `daysCount` days.
 *  Works directly in the Google Calendar Android app (no ICS / webcal needed). */
export function getGoogleCalendarEventUrls(
  schedule: string[],
  glassSizeMl: number,
  daysCount = 7,
): { time: string; url: string }[] {
  const today = new Date();
  const d = today.toISOString().slice(0, 10).replace(/-/g, '');

  return schedule.map((time, i) => {
    const [h, m] = time.split(':').map(Number);
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const endM = m + 1 >= 60 ? 0 : m + 1;
    const endH = m + 1 >= 60 ? h + 1 : h;
    const start = `${d}T${hh}${mm}00`;
    const end   = `${d}T${String(endH).padStart(2,'0')}${String(endM).padStart(2,'0')}00`;

    const params = new URLSearchParams({
      action:  'TEMPLATE',
      text:    `💧 Toma #${i + 1} — AquaVital (${glassSizeMl} ml)`,
      dates:   `${start}/${end}`,
      recur:   `RRULE:FREQ=DAILY;COUNT=${daysCount}`,
      details: `Bebe ${glassSizeMl} ml de agua. Recordatorio ${i + 1} de ${schedule.length}. — AquaVital`,
    });
    return { time, url: `https://calendar.google.com/calendar/event?${params}` };
  });
}

export function downloadICS(schedule: string[], glassSizeMl: number): void {
  const today = new Date();
  const yyyy  = today.getFullYear();
  const MM    = String(today.getMonth() + 1).padStart(2, '0');
  const dd    = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${MM}${dd}`;

  const events = schedule.map((time, i) => {
    const [h, m] = time.split(':').map(Number);
    const hStr = String(h).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    return [
      'BEGIN:VEVENT',
      `UID:aquavital-${hStr}${mStr}-${i}@aquavital`,
      `DTSTART:${dateStr}T${hStr}${mStr}00`,
      'DURATION:PT1M',
      'RRULE:FREQ=DAILY;COUNT=7',
      `SUMMARY:💧 Tomar agua (${glassSizeMl} ml)`,
      `DESCRIPTION:Toma #${i + 1}. Bebe ${glassSizeMl} ml. — AquaVital`,
      'BEGIN:VALARM',
      'TRIGGER:PT0S',
      'ACTION:DISPLAY',
      `DESCRIPTION:💧 Bebe ${glassSizeMl} ml de agua ahora`,
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AquaVital//Hydration Reminders//ES',
    'X-WR-CALNAME:AquaVital – Hidratación',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'aquavital-recordatorios.ics';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
