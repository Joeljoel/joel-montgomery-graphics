# Image Reference Grid

A static, browser-only utility at [`/tools/image-grid/`](https://joelmontgomery.graphics/tools/image-grid/) for collecting Easil image references and arranging them into a compact, screenshot-friendly gallery. No backend or Easil API access is required.

## Usage

1. Drag **Copy image links** from the tool to your bookmarks bar.
2. In Easil, open the relevant image list and scroll to load the images you want.
3. Click the saved bookmark, then paste the copied links into Image Reference Grid and select **Find Images**. You can also paste compatible HTML or upload an HTML file.
4. Use **Columns** (`Auto` or 1–8) to choose the gallery width, **Background** to change the canvas colour, or hover over a tile to remove it. **Restore removed** brings the tiles back.
5. Select **Screenshot view** to hide the toolbar and removal controls. Capture only the occupied part of the canvas; click the grid or press Escape to exit.

Only images loaded into the Easil page at the time of collection can be copied. Saved HTML or View Source may miss dynamically loaded images. The utility accepts Easil S3 image links, deduplicates them, and tries the original image before falling back to its thumbnail. Failed links show an unavailable tile.

## Layout

- Masonry columns are **left aligned**, with a **12px gap**, compact fixed-width tiles and unused canvas space on the right. Narrow viewports can scroll.
- Images retain their natural aspect ratios instead of being forced into equal-height cells.
- The gallery **reorders images across columns** to level the bottom edge. The layout places taller images first, then improves the balance with a bounded set of moves and swaps. Relative source order is retained within each column.
- Changing the column count, resizing the modal, loading another image, or removing/restoring an image recalculates the layout. Normal and screenshot views use the same arrangement.
- The bottom edge cannot always be perfectly straight: image aspect ratios and fixed gaps limit how evenly individual tiles can be partitioned. No image is cropped or stretched to artificially force alignment.

Implementation: [`layout.mjs`](layout.mjs) provides the `layout` and `pack` functions. [`script.js`](script.js) renders the assigned columns.

## Tests

With Node.js (no dependencies):

```sh
node --test tools/image-grid/layout.test.mjs
```

These cover balancing, aspect ratios, column counts and deterministic placement. Browser interaction with real Easil URLs should also be checked before merging.
