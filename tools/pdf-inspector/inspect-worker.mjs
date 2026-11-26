import './pdf-lib.min.js';
import { analysePage, summarisePages } from './core.mjs';

import { writeBleed } from './bleed.mjs';

self.onmessage = async ({data: file}) => {
  try {
    const library = self.PDFLib;
    if (file.action === 'bleed') {
      const bytes = await writeBleed(file.source, file.mm, file.marks, library);
      self.postMessage({ bytes }, [bytes.buffer]);
      return;
    }
    const doc = await library.PDFDocument.load(await file.arrayBuffer(), {updateMetadata: false});
    const pages = doc.getPages().map(page => analysePage(page, library));
    if (!pages.length) throw new Error('This PDF has no pages.');
    self.postMessage({pages, summary: summarisePages(pages)});
  } catch (error) {
    self.postMessage({error: String(error.message || error)});
  }
};
