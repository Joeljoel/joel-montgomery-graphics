importScripts('vendor/qrcode.js');
qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
self.onmessage = ({data: {id, text, correction}}) => {
  try {
    const qr = qrcode(0, correction);
    qr.addData(text, 'Byte'); qr.make();
    const size = qr.getModuleCount(), cells = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) cells[y * size + x] = qr.isDark(y, x) ? 1 : 0;
    self.postMessage({id, size, cells}, [cells.buffer]);
  } catch { self.postMessage({id, error: 'Content is too long for a QR code at this correction level.'}); }
};
