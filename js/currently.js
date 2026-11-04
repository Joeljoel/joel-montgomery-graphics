(() => {
  'use strict';
  const root = document.querySelector('[data-currently]');
  if (!root) return;

  const statuses = {
    easil: { text: 'Designing and Building at', logo: 'tools/assets/easilLogo.png', name: 'Easil' },
    sleeping: { text: 'Sleeping 😴' },
    workout: { text: 'Working Out 🏋️' },
    ready: { text: 'Getting Ready 🚿' },
    commute: { text: 'Driving to Work 🚗' },
    home: { text: 'Driving Home 🏡' },
    relaxing: { text: 'Relaxing 🛋️' }
  };
  const weekdays = [1, 2, 3, 4, 5];
  const weekends = [0, 6];
  // Brisbane local time; 0 = Sunday. Start inclusive, end exclusive.
  // Split sleep at midnight so Saturday and Monday get their own wake-up times.
  const schedule = [
    { days: [0, 1, 2, 3, 4, 5, 6], start: '22:00', end: '24:00', status: 'sleeping' },
    { days: weekdays, start: '00:00', end: '05:30', status: 'sleeping' },
    { days: weekends, start: '00:00', end: '08:00', status: 'sleeping' },
    { days: weekdays, start: '05:30', end: '07:00', status: 'workout' },
    { days: weekdays, start: '07:00', end: '08:30', status: 'ready' },
    { days: weekdays, start: '08:30', end: '09:00', status: 'commute' },
    { days: weekdays, start: '09:00', end: '17:00', status: 'easil' },
    { days: weekdays, start: '17:00', end: '17:30', status: 'home' },
    { days: weekdays, start: '17:30', end: '22:00', status: 'relaxing' },
    { days: weekends, start: '08:00', end: '22:00', status: 'relaxing' }
  ];
  const fallback = 'relaxing';
  const clock = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const minutes = value => {
    const [hours, mins] = value.split(':').map(Number);
    return hours * 60 + mins;
  };
  function selectStatus(date) {
    const parts = Object.fromEntries(clock.formatToParts(date).map(p => [p.type, p.value]));
    const day = days.indexOf(parts.weekday);
    const now = Number(parts.hour) * 60 + Number(parts.minute);
    const rule = schedule.find(rule => {
      const start = minutes(rule.start), end = minutes(rule.end);
      if (end > start) return rule.days.includes(day) && now >= start && now < end;
      return (rule.days.includes(day) && now >= start) ||
        (rule.days.includes((day + 6) % 7) && now < end);
    });
    return statuses[rule?.status] || statuses[fallback];
  }
  let previous;
  function update() {
    const status = selectStatus(new Date());
    if (status === previous) return;
    previous = status;
    root.querySelector('[data-currently-text]').textContent = 'Currently: ' + status.text;
    const image = root.querySelector('img');
    image.hidden = !status.logo;
    if (status.logo) {
      image.src = status.logo;
      image.alt = status.name;
    }
  }
  update();
  window.setInterval(() => { if (!document.hidden) update(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
  window.addEventListener('pageshow', update);
})();
