export function generateICS(schedule: string[], glassSizeMl: number): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const MM = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${MM}${dd}`;

  const events = schedule.map((time, i) => {
    const [h, m] = time.split(':').map(Number);
    const hStr = String(h).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    const dtStart = `${dateStr}T${hStr}${mStr}00`;
    const uid = `aquavital-${hStr}${mStr}-${i}@aquavital`;

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${dtStart}`,
      'DURATION:PT1M',
      'RRULE:FREQ=DAILY',
      `SUMMARY:💧 Tomar agua (${glassSizeMl} ml)`,
      `DESCRIPTION:Toma #${i + 1} del día. Bebe ${glassSizeMl} ml de agua pura. — AquaVital`,
      'BEGIN:VALARM',
      'TRIGGER:PT0S',
      'ACTION:DISPLAY',
      `DESCRIPTION:💧 Bebe ${glassSizeMl} ml de agua ahora`,
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AquaVital//Hydration Reminders//ES',
    'X-WR-CALNAME:AquaVital – Hidratación',
    'X-WR-CALDESC:Recordatorios diarios de hidratación · AquaVital',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadICS(schedule: string[], glassSizeMl: number): void {
  const content = generateICS(schedule, glassSizeMl);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'aquavital-recordatorios.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getGoogleCalendarUrl(time: string, glassSizeMl: number): string {
  const today = new Date();
  const [h, m] = time.split(':').map(Number);

  const fmtLocal = (d: Date) => {
    const yyyy = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}${MM}${dd}T${hh}${mm}00`;
  };

  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0);
  const end = new Date(start.getTime() + 60_000);

  const params = new URLSearchParams({
    text: '💧 Tomar agua — AquaVital',
    dates: `${fmtLocal(start)}/${fmtLocal(end)}`,
    recur: 'RRULE:FREQ=DAILY',
    details: `Toma tus ${glassSizeMl} ml de agua pura. Recordatorio diario de AquaVital.`,
  });

  return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`;
}
