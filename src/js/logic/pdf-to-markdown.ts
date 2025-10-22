import { showLoader, hideLoader, showAlert } from '../ui.js';
import { downloadFile, readFileAsArrayBuffer } from '../utils/helpers.js';
import { state } from '../state.js';

export async function pdfToMarkdown() {
  showLoader('正在转换为 Markdown...');
  try {
    const file = state.files[0];
    const arrayBuffer = await readFileAsArrayBuffer(file);
    // @ts-expect-error TS(2304) FIXME: Cannot find name 'pdfjsLib'.
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let markdown = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // This is a simple text extraction. For more advanced formatting, more complex logic is needed.
      const text = content.items.map((item: any) => item.str).join(' ');
      markdown += text + '\n\n'; // Add double newline for paragraph breaks between pages
    }

    const blob = new Blob([markdown], { type: 'text/markdown' });
    downloadFile(blob, file.name.replace(/\.pdf$/i, '.md'));
  } catch (e) {
    console.error(e);
    showAlert('转换失败', '无法转换该 PDF，可能为扫描件或文件已损坏。');
  } finally {
    hideLoader();
  }
}
