import { showLoader, hideLoader, showAlert } from '../ui.js';
import { downloadFile, readFileAsArrayBuffer } from '../utils/helpers.js';
import { state } from '../state.js';
import PDFDocument from 'pdfkit/js/pdfkit.standalone';
import blobStream from 'blob-stream';
import * as pdfjsLib from 'pdfjs-dist';

export async function changePermissions() {
  const currentPassword = (
    document.getElementById('current-password') as HTMLInputElement
  ).value;
  const newUserPassword = (
    document.getElementById('new-user-password') as HTMLInputElement
  ).value;
  const newOwnerPassword = (
    document.getElementById('new-owner-password') as HTMLInputElement
  ).value;

  // An owner password is required to enforce any permissions.
  if (
    !newOwnerPassword &&
    (newUserPassword ||
      document.querySelectorAll('input[type="checkbox"]:not(:checked)').length >
        0)
  ) {
    showAlert(
      '需要输入',
      '若要限制权限或设置用户密码，必须先设置“新的所有者密码”。'
    );
    return;
  }

  showLoader('正在准备处理...');

  try {
    const file = state.files[0];
    const pdfData = await readFileAsArrayBuffer(file);

    let pdf;
    try {
      pdf = await pdfjsLib.getDocument({
        data: pdfData as ArrayBuffer,
        password: currentPassword,
      }).promise;
    } catch (e) {
      // This catch is specific to password errors in pdf.js
      if (e.name === 'PasswordException') {
        hideLoader();
        showAlert('密码错误', '您输入的当前密码不正确。');
        return;
      }
      throw e;
    }

    const numPages = pdf.numPages;
    const pageImages = [];

    for (let i = 1; i <= numPages; i++) {
      document.getElementById('loader-text').textContent =
        `正在处理第 ${i} 页，共 ${numPages} 页...`;
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      pageImages.push({
        data: canvas.toDataURL('image/jpeg', 0.8),
        width: viewport.width,
        height: viewport.height,
      });
    }

    document.getElementById('loader-text').textContent = '正在应用新的权限设置...';

    const allowPrinting = (
      document.getElementById('allow-printing') as HTMLInputElement
    ).checked;
    const allowCopying = (
      document.getElementById('allow-copying') as HTMLInputElement
    ).checked;
    const allowModifying = (
      document.getElementById('allow-modifying') as HTMLInputElement
    ).checked;
    const allowAnnotating = (
      document.getElementById('allow-annotating') as HTMLInputElement
    ).checked;
    const allowFillingForms = (
      document.getElementById('allow-filling-forms') as HTMLInputElement
    ).checked;
    const allowContentAccessibility = (
      document.getElementById('allow-content-accessibility') as HTMLInputElement
    ).checked;
    const allowDocumentAssembly = (
      document.getElementById('allow-document-assembly') as HTMLInputElement
    ).checked;

    const doc = new PDFDocument({
      size: [pageImages[0].width, pageImages[0].height],
      pdfVersion: '1.7ext3', // Uses 256-bit AES encryption

      // Apply the new, separate user and owner passwords
      userPassword: newUserPassword,
      ownerPassword: newOwnerPassword,

      // Apply all seven permissions from the checkboxes
      permissions: {
        printing: allowPrinting ? 'highResolution' : false,
        modifying: allowModifying,
        copying: allowCopying,
        annotating: allowAnnotating,
        fillingForms: allowFillingForms,
        contentAccessibility: allowContentAccessibility,
        documentAssembly: allowDocumentAssembly,
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
      downloadFile(blob, `permissions-changed-${file.name}`);
      hideLoader();
      showAlert('成功', '权限已成功更新！');
    });
  } catch (e) {
    console.error(e);
    hideLoader();
    showAlert('错误', `发生未知错误：${e.message}`);
  }
}
