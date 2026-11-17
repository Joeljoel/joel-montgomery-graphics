// Shared progressive enhancement for the standalone design utility pages.
// Keep the labels and icon files aligned with /tools/index.html.
// Basketball is intentionally an Easter egg on the overview page only.
(() => {
  'use strict';

  const utilities = [
    { path: 'shape-mask', label: 'Shape Mask Converter', icon: 'shape-mask-paper.png' },
    { path: 'stretch-repeat', label: 'Stretch & Repeat Converter', icon: 'stretch-repeat-paper-v2.png' },
    { path: 'repeat', label: 'Repeating Shape Converter', icon: 'repeat-paper-v2.png' },
    { path: 'stretchable', label: 'Stretchable Shape Converter', icon: 'stretchable-paper.png' },
    { path: 'trim', label: 'Trim SVG Contents', icon: 'trim-plastic.png' },
    { path: 'barcode', label: 'Barcode Data Merge', icon: 'barcode-paper.png' },
    { path: 'qr', label: 'Bulk QR Code Generator', icon: 'qr-paper.png' },
    { path: 'image-grid', label: 'Image Reference Grid', icon: 'image-grid-paper.png' },
    { path: 'pdf-inspector', label: 'PDF Inspector', icon: 'pdf-inspector-paper.png' }
  ];

  const path = window.location.pathname.match(/\/tools\/([^/]+)(?:\/|$)/);
  const active = path && utilities.find(utility => utility.path === path[1]);
  const main = document.querySelector('body > main');
  const card = main && main.querySelector(':scope > .card');
  if (!active || !main || !card) return;

  const iconFor = (utility, className) => {
    const img = document.createElement('img');
    img.src = '../assets/icons/' + utility.icon;
    img.alt = '';
    img.width = 44;
    img.height = 44;
    if (className) img.className = className;
    return img;
  };

  const sidebar = document.createElement('aside');
  sidebar.className = 'utilities-sidebar';
  sidebar.setAttribute('aria-label', 'Design utilities');

  const heading = document.createElement('a');
  heading.className = 'utilities-home';
  heading.href = '../';
  heading.setAttribute('aria-label', 'All design utilities');
  const logo = document.createElement('img');
  logo.src = '../assets/easilLogo.png';
  logo.alt = '';
  logo.width = 30;
  logo.height = 30;
  const title = document.createElement('span');
  title.textContent = 'Design Utilities';
  heading.append(logo, title);

  const menu = document.createElement('nav');
  menu.id = 'utilities-navigation';
  menu.className = 'utilities-menu';
  menu.setAttribute('aria-label', 'Choose a design utility');

  for (const utility of utilities) {
    const link = document.createElement('a');
    link.href = '../' + utility.path + '/';
    const name = document.createElement('span');
    name.className = 'utilities-name';
    name.textContent = utility.label;
    if (utility === active) {
      link.setAttribute('aria-current', 'page');
      const indicator = document.createElement('span');
      indicator.className = 'utilities-active-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      link.append(indicator);
    }
    link.append(iconFor(utility), name);
    menu.append(link);
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'utilities-toggle';
  toggle.setAttribute('aria-controls', menu.id);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Browse utilities. Current: ' + active.label);
  const toggleCopy = document.createElement('span');
  toggleCopy.className = 'utilities-toggle-copy';
  const eyebrow = document.createElement('small');
  eyebrow.textContent = 'Current utility';
  const currentLabel = document.createElement('strong');
  currentLabel.textContent = active.label;
  toggleCopy.append(eyebrow, currentLabel);
  const chevron = document.createElement('span');
  chevron.className = 'utilities-toggle-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  toggle.append(iconFor(active), toggleCopy, chevron);

  const overview = document.createElement('a');
  overview.className = 'utilities-overview';
  overview.href = '../';
  overview.textContent = '← All utilities';

  function setOpen(open) {
    sidebar.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }
  toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
  sidebar.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  sidebar.append(heading, toggle, menu, overview);
  main.insertBefore(sidebar, card);
  // Activate the CSS only after the navigation is in place. Without JS,
  // each independent utility retains its original full-width layout.
  document.body.classList.add('utilities-shell');
})();
