import { showLoader, hideLoader, showAlert } from '../ui.js';
import { downloadFile, readFileAsArrayBuffer } from '../utils/helpers.js';
import { state } from '../state.js';

import { PDFDocument as PDFLibDocument } from 'pdf-lib';

/**
 * Converts any image into a standard, web-friendly JPEG. Loses transparency.
 * @param {Uint8Array} imageBytes The raw bytes of the image file.
 * @returns {Promise<Uint8Array>} A promise that resolves with sanitized JPEG bytes.
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
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        async (jpegBlob) => {
          if (!jpegBlob)
            return reject(new Error('Canvas 转换 JPEG 失败。'));
          resolve(new Uint8Array(await jpegBlob.arrayBuffer()));
        },
        'image/jpeg',
        0.9
      );
      URL.revokeObjectURL(imageUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('无法将文件加载为图像。'));
    };
    img.src = imageUrl;
  });
}

/**
 * Converts any image into a standard PNG. Preserves transparency.
 * @param {Uint8Array} imageBytes The raw bytes of the image file.
 * @returns {Promise<Uint8Array>} A promise that resolves with sanitized PNG bytes.
 */
function sanitizeImageAsPng(imageBytes: any) {
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
      canvas.toBlob(async (pngBlob) => {
        if (!pngBlob)
          return reject(new Error('Canvas 转换 PNG 失败。'));
        resolve(new Uint8Array(await pngBlob.arrayBuffer()));
      }, 'image/png');
      URL.revokeObjectURL(imageUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('无法将文件加载为图像。'));
    };
    img.src = imageUrl;
  });
}

export async function imageToPdf() {
  if (state.files.length === 0) {
    showAlert('未选择文件', '请至少选择一张图片。');
    return;
  }
  showLoader('正在将图片转换为 PDF...');
  try {
    const pdfDoc = await PDFLibDocument.create();
    const imageList = document.getElementById('image-list');
    const sortedFiles = Array.from(imageList.children)
      // @ts-expect-error TS(2339) FIXME: Property 'dataset' does not exist on type 'Element... Remove this comment to see the full error message
      .map((li) => state.files.find((f) => f.name === li.dataset.fileName))
      .filter(Boolean);

    for (const file of sortedFiles) {
      const fileBuffer = await readFileAsArrayBuffer(file);
      let image;

      if (file.type === 'image/jpeg') {
        try {
          image = await pdfDoc.embedJpg(fileBuffer as Uint8Array);
        } catch (e) {
          console.warn(
            `直接嵌入 JPG 失败：${file.name}，正在转为 JPG 后重试...`
          );
          const sanitizedBytes = await sanitizeImageAsJpeg(fileBuffer);
          image = await pdfDoc.embedJpg(sanitizedBytes as Uint8Array);
        }
      } else if (file.type === 'image/png') {
        try {
          image = await pdfDoc.embedPng(fileBuffer as Uint8Array);
        } catch (e) {
          console.warn(
            `直接嵌入 PNG 失败：${file.name}，正在转为 PNG 后重试...`
          );
          const sanitizedBytes = await sanitizeImageAsPng(fileBuffer);
          image = await pdfDoc.embedPng(sanitizedBytes as Uint8Array);
        }
      } else {
        // For WebP and other types, convert to PNG to preserve transparency
        console.warn(
          `不支持的类型 "${file.type}"（${file.name}），将先转换为 PNG...`
        );
        const sanitizedBytes = await sanitizeImageAsPng(fileBuffer);
        image = await pdfDoc.embedPng(sanitizedBytes as Uint8Array);
      }

      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }

    if (pdfDoc.getPageCount() === 0) {
      throw new Error('没有可处理的有效图片，请检查文件。');
    }

    const pdfBytes = await pdfDoc.save();
    downloadFile(
      new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' }),
      'from-images.pdf'
    );
  } catch (e) {
    console.error(e);
    showAlert('错误', e.message || '无法从图片生成 PDF。');
  } finally {
    hideLoader();
  }
}
