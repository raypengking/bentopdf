import { showLoader, hideLoader, showAlert } from '../ui.js';
import { downloadFile } from '../utils/helpers.js';
import { state } from '../state.js';

import { PDFDocument as PDFLibDocument } from 'pdf-lib';

export async function pdfToGreyscale() {
  if (!state.pdfDoc) {
    showAlert('错误', '尚未加载 PDF。');
    return;
  }
  showLoader('正在转换为灰度...');
  try {
    const newPdfDoc = await PDFLibDocument.create();
    const pdfBytes = await state.pdfDoc.save();
    // @ts-expect-error TS(2304) FIXME: Cannot find name 'pdfjsLib'.
    const pdfjsDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;

    for (let i = 1; i <= pdfjsDoc.numPages; i++) {
      const page = await pdfjsDoc.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      await page.render({ canvasContext: ctx, viewport }).promise;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let j = 0; j < data.length; j += 4) {
        const avg = (data[j] + data[j + 1] + data[j + 2]) / 3;
        data[j] = avg; // red
        data[j + 1] = avg; // green
        data[j + 2] = avg; // blue
      }
      ctx.putImageData(imageData, 0, 0);

      const imageBytes = await new Promise((resolve) =>
        canvas.toBlob((blob) => {
          const reader = new FileReader();
          // @ts-expect-error TS(2769) FIXME: No overload matches this call.
          reader.onload = () => resolve(new Uint8Array(reader.result));
          reader.readAsArrayBuffer(blob);
        }, 'image/png')
      );

      const image = await newPdfDoc.embedPng(imageBytes as Uint8Array);
      const newPage = newPdfDoc.addPage([image.width, image.height]);
      newPage.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }
    const newPdfBytes = await newPdfDoc.save();
    downloadFile(
      new Blob([new Uint8Array(newPdfBytes)], { type: 'application/pdf' }),
      'greyscale.pdf'
    );
  } catch (e) {
    console.error(e);
    showAlert('错误', '无法转换为灰度。');
  } finally {
    hideLoader();
  }
}
