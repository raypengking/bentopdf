import { showLoader, hideLoader, showAlert } from '../ui.js';
import { downloadFile, readFileAsArrayBuffer } from '../utils/helpers.js';
import { state } from '../state.js';
import PDFDocument from 'pdfkit/js/pdfkit.standalone';
import blobStream from 'blob-stream';
import * as pdfjsLib from 'pdfjs-dist';

export async function decrypt() {
  const file = state.files[0];
  // @ts-expect-error TS(2339) FIXME: Property 'value' does not exist on type 'HTMLEleme... Remove this comment to see the full error message
  const password = document.getElementById('password-input').value;
  if (!password.trim()) {
    showAlert('需要输入', '请输入 PDF 密码。');
    return;
  }

  try {
    showLoader('正在准备处理...');
    const pdfData = (await readFileAsArrayBuffer(file)) as ArrayBuffer;
    const pdf = await pdfjsLib.getDocument({
      data: pdfData,
      password: password,
    }).promise;
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
      '正在生成解锁后的 PDF...';
    const doc = new PDFDocument({
      size: [pageImages[0].width, pageImages[0].height],
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
      downloadFile(blob, `unlocked-${file.name}`);
      hideLoader();
      showAlert('成功', '解密完成，下载已开始。');
    });
  } catch (error) {
    console.error('Error during PDF decryption:', error);
    hideLoader();
    if (error.name === 'PasswordException') {
      showAlert('密码错误', '您输入的密码不正确。');
    } else {
      showAlert('错误', '操作失败，PDF 可能已损坏。');
    }
  }
}
