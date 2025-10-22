import { showLoader, hideLoader, showAlert } from '../ui.js';
import { downloadFile, readFileAsArrayBuffer } from '../utils/helpers.js';
import { state } from '../state.js';

import { PDFDocument as PDFLibDocument } from 'pdf-lib';

export async function webpToPdf() {
  if (state.files.length === 0) {
    showAlert('未选择文件', '请至少选择一个 WebP 文件。');
    return;
  }
  showLoader('正在将 WebP 转换为 PDF...');
  try {
    const pdfDoc = await PDFLibDocument.create();
    for (const file of state.files) {
      const webpBytes = await readFileAsArrayBuffer(file);
      // @ts-expect-error TS(2322) FIXME: Type 'unknown' is not assignable to type 'BlobPart... Remove this comment to see the full error message
      const imageBitmap = await createImageBitmap(new Blob([webpBytes]));

      const canvas = document.createElement('canvas');
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageBitmap, 0, 0);

      const pngBlob = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      // @ts-expect-error TS(2339) FIXME: Property 'arrayBuffer' does not exist on type 'unk... Remove this comment to see the full error message
      const pngBytes = await pngBlob.arrayBuffer();

      // Embed the converted PNG into the PDF
      const pngImage = await pdfDoc.embedPng(pngBytes);
      const page = pdfDoc.addPage([pngImage.width, pngImage.height]);
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pngImage.width,
        height: pngImage.height,
      });
    }
    const pdfBytes = await pdfDoc.save();
    downloadFile(
      new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' }),
      'from_webp.pdf'
    );
  } catch (e) {
    console.error(e);
    showAlert('错误', 'WebP 转 PDF 失败，请确认文件有效。');
  } finally {
    hideLoader();
  }
}
