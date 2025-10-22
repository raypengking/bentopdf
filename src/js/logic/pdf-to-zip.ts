import { showLoader, hideLoader, showAlert } from '../ui.js';
import { downloadFile, readFileAsArrayBuffer } from '../utils/helpers.js';
import { state } from '../state.js';
import JSZip from 'jszip';

export async function pdfToZip() {
  if (state.files.length === 0) {
    showAlert('未选择文件', '请至少选择一个 PDF 文件。');
    return;
  }
  showLoader('正在创建 ZIP 文件...');
  try {
    const zip = new JSZip();
    for (const file of state.files) {
      const fileBuffer = await readFileAsArrayBuffer(file);
      zip.file(file.name, fileBuffer as ArrayBuffer);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadFile(zipBlob, 'pdfs.zip');
  } catch (e) {
    console.error(e);
    showAlert('错误', '创建 ZIP 文件失败。');
  } finally {
    hideLoader();
  }
}
