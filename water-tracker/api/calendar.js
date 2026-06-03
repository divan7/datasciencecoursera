// Replication of formula.ts and plan.ts logic for server-side use

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function buildSchedule(dailyGoalMl, glassSizeMl, wakeTime, sleepTime) {
  const glasses = Math.ceil(dailyGoalMl / glassSizeMl);
  const wakeMin = timeToMinutes(wakeTime);
  const sleepMin = timeToMinutes(sleepTime);
  const available = sleepMin - wakeMin - 60;
  const interval = glasses > 1 ? Math.floor(available / (glasses - 1)) : available;
  return Array.from({ length: glasses }, (_, i) => minutesToTime(wakeMin + i * interval));
}

function buildHydrationPlan(initialGlasses, finalGoalMl, glassSizeMl) {
  const finalGlasses = Math.ceil(finalGoalMl / glassSizeMl);
  const startGlasses = Math.max(2, initialGlasses + 2);

  if (startGlasses >= finalGlasses) {
    return [{ weekNumber: 1, dailyGoalMl: finalGoalMl }];
  }

  const weeks = [];
  let glasses = startGlasses;
  let weekNum = 1;
  while (glasses < finalGlasses) {
    weeks.push({ weekNumber: weekNum, dailyGoalMl: glasses * glassSizeMl });
    glasses = Math.min(glasses + 2, finalGlasses);
    weekNum++;
  }
  weeks.push({ weekNumber: weekNum, dailyGoalMl: finalGoalMl });
  return weeks;
}

/** Returns a YYYYMMDD date string offset by `days` from `baseDate` (YYYY-MM-DD). */
function offsetDate(baseDate, days) {
  const d = new Date(baseDate + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('');
}

function generateFullPlanICS(t0, initialGlasses, goalMl, glassSizeMl, wakeTime, sleepTime) {
  const weeks = buildHydrationPlan(initialGlasses, goalMl, glassSizeMl);

  // Determine how many days into the plan we are (start from today)
  const planStart = new Date(t0 + 'T12:00:00');
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const daysSinceStart = Math.max(0, Math.round((today - planStart) / 86_400_000));

  const events = [];

  weeks.forEach((week, wi) => {
    const weekStartDay = wi * 7;
    const weekEndDay   = weekStartDay + 6;

    // Skip days already in the past
    const firstDay = Math.max(weekStartDay, daysSinceStart);
    if (firstDay > weekEndDay) return;

    const schedule = buildSchedule(week.dailyGoalMl, glassSizeMl, wakeTime, sleepTime);

    for (let day = firstDay; day <= weekEndDay; day++) {
      const dateStr = offsetDate(t0, day);

      schedule.forEach((time, ti) => {
        const [h, m] = time.split(':').map(Number);
        const hStr = String(h).padStart(2, '0');
        const mStr = String(m).padStart(2, '0');
        const uid = `aquavital-w${wi + 1}-d${day}-t${ti}@aquavital`;

        events.push([
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTART:${dateStr}T${hStr}${mStr}00`,
          'DURATION:PT1M',
          `SUMMARY:💧 Tomar agua (${glassSizeMl} ml)`,
          `DESCRIPTION:Semana ${wi + 1} · Toma #${ti + 1} de ${schedule.length}. Bebe ${glassSizeMl} ml de agua. — AquaVital`,
          'BEGIN:VALARM',
          'TRIGGER:PT0S',
          'ACTION:DISPLAY',
          `DESCRIPTION:💧 Bebe ${glassSizeMl} ml de agua ahora`,
          'END:VALARM',
          'END:VEVENT',
        ].join('\r\n'));
      });
    }
  });

  if (events.length === 0) {
    // Fallback: generate today's schedule if plan already finished
    const schedule = buildSchedule(goalMl, glassSizeMl, wakeTime, sleepTime);
    const dateStr = offsetDate(t0, daysSinceStart);
    schedule.forEach((time, ti) => {
      const [h, m] = time.split(':').map(Number);
      events.push([
        'BEGIN:VEVENT',
        `UID:aquavital-done-${ti}@aquavital`,
        `DTSTART:${dateStr}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`,
        'DURATION:PT1M',
        'RRULE:FREQ=DAILY',
        `SUMMARY:💧 Tomar agua (${glassSizeMl} ml)`,
        `DESCRIPTION:Meta alcanzada. Toma #${ti + 1}. — AquaVital`,
        'BEGIN:VALARM',
        'TRIGGER:PT0S',
        'ACTION:DISPLAY',
        `DESCRIPTION:💧 Bebe ${glassSizeMl} ml de agua ahora`,
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n'));
    });
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AquaVital//Hydration Plan//ES',
    'X-WR-CALNAME:AquaVital – Plan de Hidratación',
    'X-WR-CALDESC:Plan completo de recordatorios de hidratación · AquaVital',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export default function handler(req, res) {
  const { t0, ig, goal, ml, wake, sleep } = req.query;

  if (!t0 || ig === undefined || !goal) {
    res.status(400).json({ error: 'Required: t0 (YYYY-MM-DD), ig (initialGlasses), goal (finalGoalMl), ml, wake, sleep' });
    return;
  }

  const initialGlasses = parseInt(String(ig), 10);
  const goalMl         = parseInt(String(goal), 10);
  const glassSizeMl    = parseInt(String(ml ?? '250'), 10) || 250;
  const wakeTime       = String(wake  ?? '06:00');
  const sleepTime      = String(sleep ?? '22:00');

  const ics = generateFullPlanICS(String(t0), initialGlasses, goalMl, glassSizeMl, wakeTime, sleepTime);

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="aquavital-plan.ics"');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(ics);
}
