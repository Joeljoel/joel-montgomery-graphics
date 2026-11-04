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

test('name letters explore full axes while Joel varies up to Montgomery width', () => {
  assert.match(home, /Roboto\+Flex:wdth,wght@50\.\.145,100\.\.1000/);
  assert.match(animations, /const activity=1-\.36\*w\.mix/);
  assert.match(animations, /550\+450\*n\*activity/);
  assert.match(animations, /97\.5\+47\.5\*wave\*activity/);
  assert.match(animations, /Math\.max\(100,Math\.min\(1000,/);
  assert.match(animations, /Math\.max\(50,Math\.min\(145,/);
  assert.match(animations, /Math\.max\(\.28,Math\.min\(3\.15,/);
  assert.match(animations, /w\.run\.style\.transform=normalization/);
  assert.match(animations, /function scaleForWord\(w,currentWidth\)/);
  assert.match(animations, /w===runs\[0\]\?Math\.min\(1,maxWidth\/currentWidth\)/);
  assert.match(animations, /w\.ratio\*parseFloat\(getComputedStyle\(w\.line\)\.fontSize\)\/currentWidth/);
  assert.match(animations, /scaleForWord\(w,e\.contentRect\.width\)/);
  assert.match(animations, /observer\.observe\(w\.run\)/);
  // At rest each glyph can reach the actual native axis endpoints.
  assert.equal(550-450,100);
  assert.equal(550+450,1000);
  assert.equal(97.5-47.5,50);
  assert.equal(97.5+47.5,145);
});


test('Joel width stays natural until capped to the actual Montgomery limit', () => {
  // Run the same helper used by ResizeObserver with two mock word runs;
  // Montgomery's calibrated 8em width is the maximum, not Joel's old 4em.
  const start=animations.indexOf(' function scaleForWord(w,currentWidth){');
  const end=animations.indexOf(' // ResizeObserver supplies',start);
  assert.ok(start>0 && end>start);
  const runs=[
    {ratio:4,line:{fontSize:'20px'}},
    {ratio:8,line:{fontSize:'20px'}}
  ];
  const getComputedStyle=line=>({fontSize:line.fontSize});
  const scaleForWord=new Function('runs','getComputedStyle',
    animations.slice(start,end)+';return scaleForWord;')(runs,getComputedStyle);
  assert.equal(scaleForWord(runs[0],65),1);     // narrower Joel stays narrow
  assert.equal(scaleForWord(runs[0],120),1);    // now wider than initial 80px
  assert.equal(scaleForWord(runs[0],160),1);    // exactly matches Montgomery
  assert.equal(scaleForWord(runs[0],200),.8);  // cannot exceed Montgomery
  assert.equal(scaleForWord(runs[1],200),.8);  // Montgomery still fixed at 160px
  assert.equal(scaleForWord(runs[1],100),1.6);
  runs[1].line.fontSize='15px';                // responsive cap recomputes
  assert.equal(scaleForWord(runs[0],160),.75);
  assert.equal(scaleForWord(runs[1],160),.75);
  assert.match(animations, /w\.line\.style\.setProperty\('--intro-run-transform',normalization\)/);
});

test('featured title Echo effect samples past positions with no lead scaling', () => {
  const headings = [...home.matchAll(/<h3><span class="title-label">([^<]+) <svg class="tile-arrow"[^>]*>[\s\S]*?<\/svg><\/span><\/h3>/g)];
  assert.equal(headings.length, 3);
  assert.doesNotMatch(home, /id="title-elastic-|title-velocity-blur|title-smear/);
  assert.match(animations, /const enterDuration=385,exitDuration=470,spacing=7,echoCount=40/);
  assert.match(animations, /const duration=next>from\?enterDuration:exitDuration/);
  assert.match(animations, /move\.duration\|\|exitDuration/);
  assert.equal(385<470,true);
  assert.match(animations, /echo\.style\.display=smeared\?'block':'none'/);
  assert.doesNotMatch(animations, /echo\.style\.opacity/);
  const echoStyle = styles.slice(styles.lastIndexOf('/* Solid-ink Echo trail'));
  assert.doesNotMatch(echoStyle, /blur\(|opacity:/);
  assert.match(echoStyle, /color:var\(--blue\);display:none;/);
  assert.match(animations, /positionAt\(item,now-\(i\+1\)\*spacing\)/);
  assert.match(animations, /const entering=move\.to>move\.from/);
  assert.match(animations, /const ease=entering\?1-Math\.pow\(1-t,3\)/);
  assert.match(animations, /:\(t<\.5\?4\*t\*t\*t:1-4\*Math\.pow\(1-t,3\)\)/);
  // Entry responds immediately and then eases out. Exit retains its original
  // symmetric ease-in/out. Neither curve reverses or overshoots.
  const enter=t=>1-Math.pow(1-t,3);
  const exit=t=>t<.5?4*t*t*t:1-4*Math.pow(1-t,3);
  for(const ease of [enter,exit]){
    const positions=Array.from({length:101},(_,i)=>ease(i/100));
    assert.equal(positions[0],0);
    assert.equal(positions.at(-1),1);
    assert.ok(positions.every((p,i)=>i===0||p>=positions[i-1]));
  }
  assert.ok(enter(.01)>.025);
  assert.ok(enter(.5)>.85);
  assert.ok(exit(.01)<.001);
  assert.ok(exit(.5)===.5);
  assert.match(animations, /item\.label\.style\.transform='translate3d\('/);
  assert.match(animations, /layer\.setAttribute\('aria-hidden','true'\)/);
  assert.match(animations, /enabled=!reduced\.matches/);
  assert.match(animations, /document\.body\.dataset\.look===item\.look/);
  assert.doesNotMatch(animations, /scaleX\(.*item\.stretch|item\.skewV|smear-band|smear-trail/);
  assert.match(styles, /\.work h3\.title-echo-active\{transform:none!important/);
  assert.match(styles, /\.work h3 \.title-echoes/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)\{\.work \.title-echoes\{display:none\}/);
});

test('featured tile arrows are vector icons and appear in Echo copies', () => {
  assert.equal((home.match(/<svg class="tile-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false">/g)||[]).length,3);
  assert.equal((home.match(/<path d="M5 19L19 5M9 5H19V15"\/>/g)||[]).length,3);
  assert.doesNotMatch(home, /<h3>[^<]*↗|<span class="title-label">[^<]*↗/);
  assert.match(styles, /\.work h3 \.tile-arrow\{/);
  assert.match(styles, /stroke:currentColor/);
  assert.match(animations, /echo\.append\(\.\.\.Array\.from\(label\.childNodes,node=>node\.cloneNode\(true\)\)\)/);
});

test('hero name has solid ink echoes and scrub-only typography controls', () => {
  assert.match(animations, /const introEchoes=new Map\(\)/);
  assert.match(animations, /real\.cloneNode\(true\)/);
  assert.match(animations, /frame-\(j\+1\)\*\.6/);
  assert.match(animations, /echo\.style\.display=!rm\.matches/);
  assert.match(animations, /updateTextBounds\(i,el,u\)/);
  assert.match(animations, /document\.body\.classList\.contains\('editing'\)/);
  assert.match(animations, /line\.querySelector\('\.word-run'\)/);
  assert.match(animations, /rect\.width\*\(1-u\)/);
  assert.match(animations, /const labels=\['03 \/ JOEL','04 \/ MONTGOMERY','05 \/ ROLE','06 \/ LOCATION'\]/);
  assert.equal((home.match(/class="type-track"/g)||[]).length,8);
  assert.match(styles, /\.tracks \.type-track\{display:none\}/);
  assert.match(styles, /\.editing \.tracks \.type-track\{display:block\}/);
  assert.match(styles, /\.editing \.type-editor\{visibility:visible\}/);
  assert.match(styles, /\.hero h1 \.type-intro-echo\{/);
  assert.match(styles, /\.type-edit-handle\.h3/);
  assert.match(animations, /range\.oninput=\(\)=>/);
});

test('JM vector layer labels track edit boxes and highlights sit below complete name ink', () => {
  assert.match(animations, /const jmLabels=guides\.map\(\(guide,i\)=>/);
  assert.match(animations, /name\.textContent=i\?'02 \/ M':'01 \/ J'/);
  assert.match(animations, /layer\.append\(bg,name\);guide\.append\(layer\)/);
  assert.match(animations, /const label=jmLabels\[i\],labelWidth=/);
  assert.match(animations, /rect\(label\.bg,labelX,labelY,labelWidth,8\.5\)/);
  assert.match(animations, /label\.name\.setAttribute\('x',labelX\+2\)/);
  // The highlight must filter the combined real lettering and Echo layer,
  // rather than creating a separately inherited text-shadow on each copy.
  assert.match(animations, /el\.style\.textShadow='none'/);
  assert.match(animations, /el\.style\.filter=k>\.01/);
  assert.match(animations, /drop-shadow\('/);
  assert.doesNotMatch(animations, /el\.style\.textShadow=k>\.01/);
  assert.match(styles, /\.hero h1 \.type-intro-echoes\{/);
});

test('JM scrub labels and composition panel stay compact without moving transport', () => {
  assert.match(animations, /name\.setAttribute\('font-size','5'\)/);
  assert.match(animations, /labelWidth=24/);
  assert.match(animations, /rect\(label\.bg,labelX,labelY,labelWidth,8\.5\)/);
  assert.match(home, /<span>01 \/ J<\/span><i style="--in:0%;--out:54%"/);
  assert.match(home, /<span>02 \/ M<\/span><i style="--in:16%;--out:83%"/);
  assert.equal((home.match(/<span class="type-track">0[3-6] \/ /g)||[]).length,4);
  assert.match(styles, /\.comp-row\{[^}]*grid-template-rows:54px/);
  assert.match(styles, /\.comp-row \.transport\{grid-column:1;grid-row:1;align-self:center/);
  assert.match(styles, /\.comp-row \.tracks\{grid-column:2;grid-row:1;align-self:end;[^}]*transform:translateY\(-12px\)/);
  assert.match(styles, /\.editing \.tracks \.type-track\{display:block\}/);
});

test('hero Echo glyphs track live font variation, transforms and word width', () => {
  // Echoes must not capture a frozen snapshot of the variable-font glyphs.
  assert.match(animations, /copiedRun\.style\.transform='var\(--intro-run-transform, none\)'/);
  for (const property of ['axes', 'spacing', 'scale', 'margin']) {
    assert.ok(animations.includes("glyph.style."));
    assert.ok(animations.includes("w.line.style.setProperty('--intro-glyph-'+j+'-"+property+"'"));
  }
  assert.match(animations, /glyph\.style\.fontVariationSettings='var\('\+prefix\+'axes/);
  assert.match(animations, /glyph\.style\.letterSpacing='var\('\+prefix\+'spacing/);
  assert.match(animations, /glyph\.style\.transform='var\('\+prefix\+'scale/);
  assert.match(animations, /glyph\.style\.marginRight='var\('\+prefix\+'margin/);
  assert.match(animations, /w\.line\.style\.setProperty\('--intro-run-transform',normalization\)/);
  // The same shared values reset during font load / measurement.
  assert.match(animations, /w\.line\.style\.setProperty\(prefix\+'axes',g\.style\.fontVariationSettings\)/);
  assert.match(animations, /w\.line\.style\.setProperty\(prefix\+'scale','none'\)/);
  assert.match(animations, /w\.line\.style\.setProperty\(prefix\+'margin','0px'\)/);
  assert.match(animations, /document\.fonts\.load\('650 32px "Roboto Flex"'/);
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

test('homepage favicon uses the JM squircle while legacy and tools retain theirs', () => {
  const icon=content('favicon.svg');
  assert.match(home, /href="favicon\.ico\?v=jm-2026"/);
  assert.match(home, /href="favicon\.svg\?v=jm-2026"/);
  assert.match(icon, /fill="#1d2792"/);
  assert.match(icon, /fill="#fefaed"/);
  assert.ok(exists('favicon.ico'));
  assert.ok(exists('legacy/favicon.ico'));
  assert.ok(exists('tools/assets/favicon.ico'));
});

test('header cursor warp is gentler without changing type or footer interactions', () => {
  const footerStart = animations.indexOf("/* Echo the header's changing glyph field behind the footer links.");
  assert.ok(footerStart > 0);
  const headerAnimation = animations.slice(0, footerStart);
  const footerAnimation = animations.slice(footerStart);
  assert.match(headerAnimation, /const WARP_SWIRL=\.9,WARP_STRENGTH=88,GRID_SWIRL=\.5/);
  assert.match(headerAnimation, /swirl=WARP_SWIRL\*fall/);
  assert.match(headerAnimation, /warp\.setAttribute\('scale',power\*WARP_STRENGTH\)/);
  assert.match(headerAnimation, /\(dx-dy\*fall\*GRID_SWIRL\)\*\.28/);
  assert.match(headerAnimation, /\(dy\+dx\*fall\*GRID_SWIRL\)\*\.28/);
  assert.doesNotMatch(headerAnimation, /swirl=1\.8\*fall|power\*116/);
  assert.match(footerAnimation, /\(dx-dy\*fall\)\*\.28/);
  assert.match(headerAnimation, /550\+450\*n\*activity/);
  assert.match(headerAnimation, /97\.5\+47\.5\*wave\*activity/);
  assert.match(headerAnimation, /header\.addEventListener\('touchmove'/);
});

test('scrub-mode letter inspector follows live glyph geometry and neighbours', () => {
  assert.match(animations, /const glyphInspector=document\.createElement\('div'\)/);
  assert.match(animations, /glyphInspector\.setAttribute\('aria-hidden','true'\)/);
  assert.match(animations, /glyphInspector\.hidden=true/);
  assert.match(animations, /const glyphTags=Array\.from\(\{length:3\}/);
  assert.match(animations, /document\.body\.classList\.contains\('editing'\)/);
  assert.match(animations, /w\.glyphs\.map\(g=>g\.getBoundingClientRect\(\)\)/);
  assert.match(animations, /\[nearest-1,nearest,nearest\+1\]\.filter/);
  assert.match(animations, /String\(row\+3\)\.padStart\(2,'0'\)/);
  assert.match(animations, /renderGlyphInspector\(\);\n \/\/ Two first-order/);
  assert.match(animations, /nameHeading\.addEventListener\('pointermove'/);
  assert.match(animations, /nameHeading\.addEventListener\('pointerleave'/);
  assert.match(animations, /entry\.pin\.style\.left=\(p\.center-lefts\[i\]\)/);
  assert.match(styles, /\.editing \.glyph-inspector:not\(\[hidden\]\)\{visibility:visible\}/);
  assert.match(styles, /\.glyph-inspector\[hidden\],\.glyph-inspector-tag\[hidden\]\{display:none\}/);
  assert.match(styles, /\.glyph-inspector-pin\{/);
  assert.match(animations, /const WARP_SWIRL=\.9,WARP_STRENGTH=88,GRID_SWIRL=\.5/);
});
