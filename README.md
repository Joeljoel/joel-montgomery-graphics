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
URL. After entering a utility, tool-to-tool navigation keeps the real sidebar
mounted and replaces only the right-hand content using a same-origin iframe.
The blue active indicator is a live animated layer beneath the menu rows,
rather than a view-transition overlay. The selected row retains its artwork
and text throughout the animation. The frame is preserved after loading to
avoid a second navigation. Hover or keyboard focus prepares at most one next
utility in an off-screen frame, which the click reuses. Normal overview and
return links prefetch their destination on intent. Reduced-data preferences
skip the speculative loading.

On Chromium and Safari, overview-to-utility navigation and its reverse use
native cross-document View Transitions. The white background is rendered as a
solid rectangle whose dimensions and position interpolate between the actual
overview and sidebar border boxes; it does not stretch either snapshot's
intrinsic aspect ratio. The corner radius interpolates over the same 400ms
movement, and the return link is independently captured, fading in after the
sidebar settles. All nine tiles move independently and the highlight is
included in its tile, behind its icon and text, in both directions. In-place
content and selection transitions take about 220ms.

Firefox uses a short overview fade fallback. Older browsers without
same-document View Transitions use ordinary navigation. Reduced-motion
preferences disable the animations.

## Other projects

The site also includes [Joeldle](https://joelmontgomery.graphics/joeldle/), [Joelculator](https://joelmontgomery.graphics/calculator/) and a few hidden extras.
