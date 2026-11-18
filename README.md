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
URL. Internal navigation retains both the overview grid and utility shell in
one top-level document, using the History API for normal URLs and Back/Forward.
Opening a new tool loads it in an independent same-origin iframe; the original
tool or the currently active frame can be reused. The blue indicator slides
behind the live sidebar rows, and hover/focus warms at most one next tool.

The 400ms overview-to-sidebar morph and reverse use same-document View
Transitions, so there is no cross-document handoff or loading-frame flash.
The white rectangle interpolates its geometry and corner radius, the nine
matched tiles move independently, and the All utilities link fades in after
the morph or fades out within the first 75ms of the reverse. The other layout
remains hidden and inert until needed. The overview retains its original
responsive layout and ten-second basketball reveal.

Older browsers without same-document View Transitions use ordinary links.
Reduced-motion preferences disable animations, and direct URLs and reloads
still render their corresponding standalone HTML pages.

## Other projects

The site also includes [Joeldle](https://joelmontgomery.graphics/joeldle/), [Joelculator](https://joelmontgomery.graphics/calculator/) and a few hidden extras.
