import { showLoader, hideLoader, showAlert } from '../ui.js';
import { downloadFile, readFileAsArrayBuffer } from '../utils/helpers.js';
import { state } from '../state.js';

import { PDFDocument as PDFLibDocument } from 'pdf-lib';

export async function pngToPdf() {
  if (state.files.length === 0) {
    showAlert('未选择文件', '请至少选择一个 PNG 文件。');
    return;
  }
  showLoader('正在将 PNG 生成 PDF...');
  try {
    const pdfDoc = await PDFLibDocument.create();
    for (const file of state.files) {
      const pngBytes = await readFileAsArrayBuffer(file);
      const pngImage = await pdfDoc.embedPng(pngBytes as ArrayBuffer);
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
      'from_pngs.pdf'
    );
  } catch (e) {
    console.error(e);
    showAlert('错误', '无法由 PNG 图像生成 PDF，请确认文件有效。');
  } finally {
    hideLoader();
  }
}
