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

test('individual name letters explore full font axes while word widths stay fixed', () => {
  assert.match(home, /Roboto\+Flex:wdth,wght@50\.\.145,100\.\.1000/);
  assert.match(animations, /const activity=1-\.36\*w\.mix/);
  assert.match(animations, /550\+450\*n\*activity/);
  assert.match(animations, /97\.5\+47\.5\*wave\*activity/);
  assert.match(animations, /Math\.max\(100,Math\.min\(1000,/);
  assert.match(animations, /Math\.max\(50,Math\.min\(145,/);
  assert.match(animations, /Math\.max\(\.28,Math\.min\(3\.15,/);
  assert.match(animations, /w\.run\.style\.transform='scaleX\('/);
  assert.match(animations, /w\.ratio\*parseFloat\(getComputedStyle\(w\.line\)\.fontSize\)\/e\.contentRect\.width/);
  assert.match(animations, /observer\.observe\(w\.run\)/);
  // At rest each glyph can reach the actual native axis endpoints.
  assert.equal(550-450,100);
  assert.equal(550+450,1000);
  assert.equal(97.5-47.5,50);
  assert.equal(97.5+47.5,145);
});

test('featured title Echo effect samples past positions with no lead scaling', () => {
  const headings = [...home.matchAll(/<h3><span class="title-label">([^<]+)<\/span><\/h3>/g)];
  assert.equal(headings.length, 3);
  assert.doesNotMatch(home, /id="title-elastic-|title-velocity-blur|title-smear/);
  assert.match(animations, /const duration=470,spacing=7,echoCount=40/);
  assert.match(animations, /echo\.style\.display=smeared\?'block':'none'/);
  assert.doesNotMatch(animations, /echo\.style\.opacity/);
  const echoStyle = styles.slice(styles.lastIndexOf('/* Solid-ink Echo trail'));
  assert.doesNotMatch(echoStyle, /blur\(|opacity:/);
  assert.match(echoStyle, /color:var\(--blue\);display:none;/);
  assert.match(animations, /positionAt\(item,now-\(i\+1\)\*spacing\)/);
  assert.match(animations, /1-Math\.pow\(1-t,3\)/);
  assert.match(animations, /item\.label\.style\.transform='translate3d\('/);
  assert.match(animations, /layer\.setAttribute\('aria-hidden','true'\)/);
  assert.match(animations, /enabled=!reduced\.matches/);
  assert.match(animations, /document\.body\.dataset\.look===item\.look/);
  assert.doesNotMatch(animations, /scaleX\(.*item\.stretch|item\.skewV|smear-band|smear-trail/);
  assert.match(styles, /\.work h3\.title-echo-active\{transform:none!important/);
  assert.match(styles, /\.work h3 \.title-echoes/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)\{\.work \.title-echoes\{display:none\}/);
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
