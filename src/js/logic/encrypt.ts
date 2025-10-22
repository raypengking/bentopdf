import { showLoader, hideLoader, showAlert } from '../ui.js';
import { downloadFile, readFileAsArrayBuffer } from '../utils/helpers.js';
import { state } from '../state.js';
import PDFDocument from 'pdfkit/js/pdfkit.standalone';
import blobStream from 'blob-stream';
import * as pdfjsLib from 'pdfjs-dist';

export async function encrypt() {
  const file = state.files[0];
  const password = (
    document.getElementById('password-input') as HTMLInputElement
  ).value;
  if (!password.trim()) {
    showAlert('需要输入', '请输入密码。');
    return;
  }

  try {
    showLoader('正在准备处理...');
    const pdfData = await readFileAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: pdfData as ArrayBuffer })
      .promise;
    const numPages = pdf.numPages;
    const pageImages = [];

    for (let i = 1; i <= numPages; i++) {
      document.getElementById('loader-text').textContent =
        `正在处理第 ${i} 页，共 ${numPages} 页...`;
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;
      pageImages.push({
        data: canvas.toDataURL('image/jpeg', 0.8),
        width: viewport.width,
        height: viewport.height,
      });
    }

    document.getElementById('loader-text').textContent =
      '正在加密并生成 PDF...';
    const doc = new PDFDocument({
      size: [pageImages[0].width, pageImages[0].height],
      pdfVersion: '1.7ext3', // Use 256-bit AES encryption
      userPassword: password,
      ownerPassword: password,
      permissions: {
        printing: 'highResolution',
        modifying: false,
        copying: false,
        annotating: false,
        fillingForms: false,
        contentAccessibility: true,
        documentAssembly: false,
      },
    });
    const stream = doc.pipe(blobStream());
    for (let i = 0; i < pageImages.length; i++) {
      if (i > 0)
        doc.addPage({ size: [pageImages[i].width, pageImages[i].height] });
      doc.image(pageImages[i].data, 0, 0, {
        width: pageImages[i].width,
        height: pageImages[i].height,
      });
    }
    doc.end();

    stream.on('finish', function () {
      const blob = stream.toBlob('application/pdf');
      downloadFile(blob, `encrypted-${file.name}`);
      hideLoader();
      showAlert('成功', '加密完成，下载已开始。');
    });
  } catch (error) {
    console.error('Error during PDF encryption:', error);
    hideLoader();
    showAlert('错误', '操作失败，PDF 可能已损坏。');
  }
}
