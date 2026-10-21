import {prepare, convert} from './core.mjs';
let table;
self.onmessage = ({data}) => {
  try {
    if (data.type === 'load') {
      table = null;
      table = prepare(data.text, data.delimiter, data.hasHeader);
      self.postMessage({type:'loaded', headers:table.headers, selected:table.selected, count:table.rows.length, preview:table.rows.slice(0,5), lastRow:table.rows.at(-1)});
    } else {
      if (!table) throw Error('Load data first.');
      const result = convert(table.headers, table.rows, data.source, data.name);
      self.postMessage({type:'converted', count:table.rows.length, ...result}, [result.bytes.buffer]);
    }
  } catch (e) { self.postMessage({type:'error', message:e.message}); }
};
