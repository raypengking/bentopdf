import { showLoader, hideLoader, showAlert } from '../ui.js';
import { downloadFile, readFileAsArrayBuffer } from '../utils/helpers.js';
import { state } from '../state.js';

import { PDFDocument as PDFLibDocument } from 'pdf-lib';

/**
 * Takes any image byte array and uses the browser's canvas to convert it
 * into a standard, web-friendly (baseline, sRGB) JPEG byte array.
 * @param {Uint8Array} imageBytes The raw bytes of the image file.
 * @returns {Promise<Uint8Array>} A promise that resolves with the sanitized JPEG bytes.
 */
function sanitizeImageAsJpeg(imageBytes: any) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([imageBytes]);
    const imageUrl = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        async (jpegBlob) => {
          if (!jpegBlob) {
            return reject(new Error('Canvas 转换 JPEG 失败。'));
          }
          const arrayBuffer = await jpegBlob.arrayBuffer();
          resolve(new Uint8Array(arrayBuffer));
        },
        'image/jpeg',
        0.9
      );
      URL.revokeObjectURL(imageUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('无法将该文件加载为图像，可能已损坏。'));
    };

    img.src = imageUrl;
  });
}

export async function jpgToPdf() {
  if (state.files.length === 0) {
    showAlert('未选择文件', '请至少选择一个 JPG 文件。');
    return;
  }
  showLoader('正在将 JPG 生成 PDF...');
  try {
    const pdfDoc = await PDFLibDocument.create();

    for (const file of state.files) {
      const originalBytes = await readFileAsArrayBuffer(file);
      let jpgImage;

      try {
        jpgImage = await pdfDoc.embedJpg(originalBytes as Uint8Array);
      } catch (e) {
        // @ts-expect-error TS(2554) FIXME: Expected 2 arguments, but got 1.
        showAlert(
          '提示',
          `直接嵌入 JPG 失败：${file.name}，正在尝试修复后重试...`
        );
        try {
          const sanitizedBytes = await sanitizeImageAsJpeg(originalBytes);
          jpgImage = await pdfDoc.embedJpg(sanitizedBytes as Uint8Array);
        } catch (fallbackError) {
          console.error(
            `修复后仍无法处理 ${file.name}：`,
            fallbackError
          );
          throw new Error(`无法处理“${file.name}”，文件可能已损坏。`);
        }
      }

      const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
      page.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: jpgImage.width,
        height: jpgImage.height,
      });
    }

    const pdfBytes = await pdfDoc.save();
    downloadFile(
      new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' }),
      'from_jpgs.pdf'
    );
  } catch (e) {
    console.error(e);
    showAlert('转换失败', e.message);
  } finally {
    hideLoader();
  }
}
