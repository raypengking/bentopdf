import { showLoader, hideLoader, showAlert } from '../ui.js';
import { downloadFile } from '../utils/helpers.js';
import { state } from '../state.js';

import { PDFDocument as PDFLibDocument } from 'pdf-lib';

export async function reversePages() {
  if (!state.pdfDoc) {
    showAlert('错误', '尚未加载 PDF。');
    return;
  }
  showLoader('正在倒序排列页面...');
  try {
    const newPdf = await PDFLibDocument.create();
    const pageCount = state.pdfDoc.getPageCount();
    const reversedIndices = Array.from(
      { length: pageCount },
      (_, i) => pageCount - 1 - i
    );

    const copiedPages = await newPdf.copyPages(state.pdfDoc, reversedIndices);
    copiedPages.forEach((page: any) => newPdf.addPage(page));

    const newPdfBytes = await newPdf.save();
    downloadFile(
      new Blob([new Uint8Array(newPdfBytes)], { type: 'application/pdf' }),
      'reversed.pdf'
    );
  } catch (e) {
    console.error(e);
    showAlert('错误', '无法倒序排列 PDF 页面。');
  } finally {
    hideLoader();
  }
}
