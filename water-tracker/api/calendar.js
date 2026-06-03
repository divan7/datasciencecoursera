function generateICS(schedule, glassSizeMl) {
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

export default function handler(req, res) {
  const schedule = String(req.query.schedule ?? '').split(',').filter(Boolean);
  const glassSizeMl = parseInt(String(req.query.ml ?? '250'), 10) || 250;

  if (schedule.length === 0) {
    res.status(400).json({ error: 'schedule param required (comma-separated HH:MM times)' });
    return;
  }

  const ics = generateICS(schedule, glassSizeMl);

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="aquavital-recordatorios.ics"');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(ics);
}
