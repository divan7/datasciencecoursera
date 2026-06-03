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

/** Open the plan calendar.
 *  - iOS: webcal:// → Calendar.app opens and asks to subscribe (includes all plan weeks)
 *  - Android/Desktop: downloads the .ics → open to import into any calendar app */
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

// --- Legacy client-side ICS (fallback, not tied to plan weeks) ---

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
