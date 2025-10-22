import { showLoader, hideLoader, showAlert } from '../ui.js';
import { downloadFile } from '../utils/helpers.js';
import { state } from '../state.js';

import { PDFDocument as PDFLibDocument } from 'pdf-lib';

async function convertImageToPngBytes(file: any) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const pngBlob = await new Promise((res) =>
          canvas.toBlob(res, 'image/png')
        );
        // @ts-expect-error TS(2339) FIXME: Property 'arrayBuffer' does not exist on type 'unk... Remove this comment to see the full error message
        const pngBytes = await pngBlob.arrayBuffer();
        resolve(pngBytes);
      };
      img.onerror = () => reject(new Error('图片加载失败。'));
      // @ts-expect-error TS(2322) FIXME: Type 'string | ArrayBuffer' is not assignable to t... Remove this comment to see the full error message
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('文件读取失败。'));
    reader.readAsDataURL(file);
  });
}

export async function svgToPdf() {
  if (state.files.length === 0) {
    showAlert('未选择文件', '请至少选择一个 SVG 文件。');
    return;
  }
  showLoader('正在将 SVG 转换为 PDF...');
  try {
    const pdfDoc = await PDFLibDocument.create();
    for (const file of state.files) {
      const pngBytes = await convertImageToPngBytes(file);
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
      'from_svgs.pdf'
    );
  } catch (e) {
    console.error(e);
    showAlert('错误', 'SVG 转 PDF 失败，可能包含无效文件。');
  } finally {
    hideLoader();
  }
}
