import { showLoader, hideLoader, showAlert } from '../ui.js';
import { downloadFile } from '../utils/helpers.js';
import { state } from '../state.js';

export async function flatten() {
  if (!state.pdfDoc) {
    showAlert('错误', '尚未加载 PDF。');
    return;
  }
  showLoader('正在扁平化 PDF...');
  try {
    const form = state.pdfDoc.getForm();
    form.flatten();

    const flattenedBytes = await state.pdfDoc.save();
    downloadFile(
      new Blob([flattenedBytes], { type: 'application/pdf' }),
      'flattened.pdf'
    );
  } catch (e) {
    console.error(e);
    if (e.message.includes('getForm')) {
      showAlert('未找到表单', '此 PDF 不包含可扁平化的表单字段。');
    } else {
      showAlert('错误', '无法扁平化该 PDF。');
    }
  } finally {
    hideLoader();
  }
}
