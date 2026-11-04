import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const content = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const exists = path => existsSync(new URL('../' + path, import.meta.url));
const home = content('index.html');
const styles = content('css/portfolio.css');
const animations = content('js/title-sequence.js');
const viewport = content('js/portfolio-viewport.js');

test('homepage has accessible navigation and a named hero heading', () => {
  assert.match(home, /<a class="skip-link" href="#work">Skip to selected work<\/a>/);
  assert.match(home, /<main id="work" tabindex="-1">/);
  assert.match(home, /<h1 aria-label="Joel Montgomery">/);
  assert.match(animations, /line\.setAttribute\('aria-hidden','true'\)/);
  assert.match(viewport, /body\.insertBefore\(nav,header\)/);
  assert.match(styles, /\.skip-link:focus-visible\{transform:none\}/);
});

test('selected work and the experiment list retain their links', () => {
  assert.equal((home.match(/class="art (?:wave|wordboard|hoopboard)"/g) || []).length, 3);
  assert.equal((home.match(/href="basketball\/"/g) || []).length, 2);
  assert.match(home, /href="joeldle\/"/);
  assert.match(home, /href="tools\/"/);
  assert.equal((home.match(/<h2 class="footer-label">/g) || []).length, 2);
});

test('animation keeps reduced-motion and touch support', () => {
  assert.match(animations, /mark\.addEventListener\('touchmove'/);
  assert.match(animations, /footer\.addEventListener\('touchmove'/);
  assert.match(animations, /header\.prepend\(grid\)/);
  assert.match(animations, /footer\.prepend\(canvas\)/);
  assert.match(animations, /reduced\.matches/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
});

test('featured title smear uses layered motion fragments with reduced-motion support', () => {
  const headings = [...home.matchAll(/<h3><span class="title-label">([^<]+)<\/span><span class="title-smear" aria-hidden="true" data-smear="([^"]+)"><\/span><\/h3>/g)];
  assert.equal(headings.length, 3);
  for (const match of headings) assert.equal(match[1], match[2]);
  assert.match(animations, /const bands=\[/);
  assert.match(animations, /const trails=\[/);
  assert.match(animations, /layer\.replaceChildren\(fragments\)/);
  assert.match(animations, /span\.textContent=label\.textContent/);
  assert.match(styles, /@keyframes title-ink-drag/);
  assert.match(styles, /@keyframes title-scanline-tear/);
  assert.match(styles, /@keyframes title-velocity-line/);
  assert.match(styles, /prefers-reduced-motion:reduce\)\{\.work \.title-smear\{display:none\}/);
  assert.match(styles, /body\[data-look=tools\] \.work a:first-child/);
  assert.match(styles, /body\[data-look=lab\] \.work a:nth-child\(2\)/);
  assert.match(styles, /body\[data-look=basketball\] \.work a:nth-child\(3\)/);
});

test('pre-redesign homepage is archived without a link from the new page', () => {
  const legacy = content('legacy/index.html');
  assert.match(legacy, /<meta name="robots" content="noindex,follow">/);
  assert.match(legacy, /href="css\/style\.css"/);
  assert.match(legacy, /src="js\/home-edge\.js"/);
  assert.match(legacy, /src="js\/jquery-1\.11\.0\.min\.js"/);
  assert.doesNotMatch(home, /href="\/?legacy\//);
  for (const path of [
    'legacy/css/style.css',
    'legacy/css/fonts/BASICTITLE.woff',
    'legacy/js/home-edge.js',
    'legacy/js/jquery-1.11.0.min.js',
    'legacy/images/logo.png',
    'legacy/images/hLogo.png',
    'legacy/images/arrow.png',
    'legacy/favicon.ico'
  ]) assert.ok(exists(path), 'Archive asset missing: ' + path);
});
