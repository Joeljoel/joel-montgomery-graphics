# Joel Montgomery Graphics

[joelmontgomery.graphics](https://joelmontgomery.graphics/) is home to design utilities, games and other personal projects.

## Design utilities

The [Design Utilities page](https://joelmontgomery.graphics/tools/) brings together SVG converters, generators and image-reference tools for design work, including Easil.

| Tool | What it does |
| --- | --- |
| [Shape Mask Converter](https://joelmontgomery.graphics/tools/shape-mask/) | Creates image masks from vector shapes, with options for multiple mask areas and a matching thumbnail. |
| [Stretch & Repeat Converter](https://joelmontgomery.graphics/tools/stretch-repeat/) | Creates elements with a repeating centre and fixed endcaps. |
| [Repeating Shape Converter](https://joelmontgomery.graphics/tools/repeat/) | Turns artwork into a horizontally repeating element. |
| [Stretchable Shape Converter](https://joelmontgomery.graphics/tools/stretchable/) | Splits artwork into sections for horizontal, vertical or both-direction stretching. |
| [Trim SVG Contents](https://joelmontgomery.graphics/tools/trim/) | Removes transparent space around artwork, including clipped and masked shapes. Drop multiple SVGs to trim and download them automatically. |
| [Barcode Data Merge](https://joelmontgomery.graphics/tools/barcode/) | Prepares Code 128B barcodes for InDesign Data Merge, retaining the original columns and adding a formatted barcode column. |
| [Bulk QR Code Generator](https://joelmontgomery.graphics/tools/qr/) | Creates PNG or SVG QR codes in bulk from pasted lists or spreadsheets, with custom filenames and a ZIP download. |
| [Image Reference Grid](https://joelmontgomery.graphics/tools/image-grid/) | Collects Easil image links and arranges them in a balanced, compact masonry layout for screenshots. |

Each tool includes its own usage instructions.

### Utility navigation

The nine utility pages include the sidebar HTML before rendering to avoid
layout shifts. Shared behaviour and styling live in
`tools/shared/utilities-shell.js` and `utilities-shell.css`. The sidebar
reuses the existing /tools card artwork, highlights the active utility and
collapses into a mobile selector. The basketball Easter egg stays on the /tools overview
and is deliberately omitted from the sidebar.

Each utility remains a standalone HTML document with its original script and
URL. Same-origin document navigation uses CSS View Transitions where available.
The main /tools/ overview panel morphs into the left sidebar; the right utility
panel enters independently. Older browsers use a short exit/entrance fallback;
reduced-motion preferences disable the navigation animation.

## Other projects

The site also includes [Joeldle](https://joelmontgomery.graphics/joeldle/), [Joelculator](https://joelmontgomery.graphics/calculator/) and a few hidden extras.


### Firefox utility navigation

Firefox currently supports same-document View Transitions, but not
cross-document view transitions. To avoid the sidebar vanishing during each
full page load, the shared shell intercepts internal tool-to-tool navigation
and loads the next tool inside a same-origin, unsandboxed iframe. Each tool
keeps its independent HTML, CSS and JavaScript context. The URL is updated
with History API so a direct link or page refresh still loads the standalone
tool page. Browser Back/Forward restores the corresponding panel.

The iframe mode is only used as a fallback when native cross-document
transitions aren't available. It hides the duplicated tool sidebar, resizes
the embedded content as its layout changes, and keeps the outer sidebar
mounted. The `/tools/` overview continues to use the ordinary page
navigation fallback on Firefox.

### Grid-to-sidebar transition

The empty white surface behind the illustrated overview and tool sidebar has
one shared transition name. Each of the nine utility cards has its own matching
name on the overview and the left navigation, so the two-column grid flows
into its single-column equivalent. The brand and right-hand tool content have
independent snapshots. The old sequential exit/entrance animations were
replaced by overlapping crossfades without a blank interval.

Arc/Chromium navigation uses the browser's native multi-page transition
without additional JavaScript interception or page-entry animations. Firefox
continues to use the persistent iframe shell for tool-to-tool navigation.

### Stable Chromium utility navigation and delayed selection

The tool-page bootstrap registers `pageswap` and `pagereveal` before the
first frame. On tool-to-tool navigation only, it captures the entire sidebar
as a single shared image while keeping the selected-item indicator separately
named so it can slide between rows. The nine named overview tiles remain
unchanged for overview-to-sidebar transitions. The active blue highlight
waits until the 600ms overview morph has completed before fading in.
