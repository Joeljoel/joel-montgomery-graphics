import './pdf-lib.min.js';
import { analysePage, summarisePages } from './core.mjs';

import { findRasterOutline } from './raster-outline.mjs';
import { writeBleed } from './bleed.mjs';

self.onmessage = async ({data: file}) => {
  try {
    const library = self.PDFLib;
    if (file.action === 'bleed') {
      const bytes = await writeBleed(file.source, file.mm, file.marks, library, file.recover, file.recreateOutline);
      self.postMessage({ bytes }, [bytes.buffer]);
      return;
    }
    const doc = await library.PDFDocument.load(await file.arrayBuffer(), {updateMetadata: false});
    const pages = doc.getPages().map(page => analysePage(page, library));
    if (!pages.length) throw new Error('This PDF has no pages.');
    const illustrator = doc.getPages().some(page => page.node.lookup(library.PDFName.of('PieceInfo'))?.has?.(library.PDFName.of('Illustrator')));
    const hasRasterOutline = doc.getPages().some(page => findRasterOutline(page, library));
    self.postMessage({pages, illustrator, hasRasterOutline, summary: summarisePages(pages)});
  } catch (error) {
    self.postMessage({error: String(error.message || error)});
  }
};
