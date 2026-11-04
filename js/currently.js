(() => {
  'use strict';
  const root = document.querySelector('[data-currently]');
  if (!root) return;

  const statuses = {
    easil: { text: 'Designing and Building at', logo: 'tools/assets/easilLogo.png', name: 'Easil' }
  };
  // Add rules in priority order once the schedule is supplied.
  // days: 0 = Sunday … 6 = Saturday, start/end: Brisbane HH:MM.
  // Overnight rules belong to the day they START; end times are exclusive.
  // Example: { days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00', status: 'easil' }
  const schedule = [];
  const fallback = 'easil';
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
    root.querySelector('[data-currently-text]').textContent = status.text;
    const image = root.querySelector('img');
    image.hidden = !status.logo;
    if (status.logo) {
      image.src = status.logo;
      image.alt = status.name;
    }
    // Future emoji statuses can omit logo and include the emoji in their text.
  }
  update();
  window.setInterval(() => { if (!document.hidden) update(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
  window.addEventListener('pageshow', update);
})();
