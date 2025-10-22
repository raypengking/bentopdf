import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '@/js/state';
import { PDFDocument } from 'pdf-lib';
import Sortable from 'sortablejs';
import * as helpers from '@/js/utils/helpers';
import * as ui from '@/js/ui';
import {
  setupAlternateMergeTool,
  alternateMerge,
} from '@/js/logic/alternate-merge';

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: vi.fn(),
    load: vi.fn(),
  },
}));

vi.mock('sortablejs', () => ({
  default: { create: vi.fn() },
}));

vi.mock('@/js/utils/helpers', () => ({
  readFileAsArrayBuffer: vi.fn(),
  downloadFile: vi.fn(),
}));

vi.mock('@/js/ui', () => ({
  showLoader: vi.fn(),
  hideLoader: vi.fn(),
  showAlert: vi.fn(),
}));

describe('Alternate Merge Tool', () => {
  let mockPdfDoc1: any;
  let mockPdfDoc2: any;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="alternate-merge-options" class="hidden"></div>
      <button id="process-btn"></button>
      <ul id="alternate-file-list"></ul>
    `;

    state.files = [
      new File(['dummy1'], 'file1.pdf'),
      new File(['dummy2'], 'file2.pdf'),
    ];

    mockPdfDoc1 = { getPageCount: vi.fn(() => 2) };
    mockPdfDoc2 = { getPageCount: vi.fn(() => 3) };

    vi.mocked(helpers.readFileAsArrayBuffer).mockResolvedValue(
      new ArrayBuffer(8)
    );
    vi.mocked(PDFDocument.load)
      .mockResolvedValueOnce(mockPdfDoc1)
      .mockResolvedValueOnce(mockPdfDoc2);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('setupAlternateMergeTool()', () => {
    it('should initialize UI and load PDF files', async () => {
      await setupAlternateMergeTool();

      expect(ui.showLoader).toHaveBeenCalledWith('正在加载 PDF 文件...');
      expect(ui.hideLoader).toHaveBeenCalled();
      expect(PDFDocument.load).toHaveBeenCalledTimes(2);
      expect(document.querySelectorAll('#alternate-file-list li').length).toBe(
        2
      );
      expect(Sortable.create).toHaveBeenCalled();
    });

    it('should show alert on load failure', async () => {
      vi.mocked(PDFDocument.load).mockReset();
      vi.mocked(PDFDocument.load).mockRejectedValueOnce(new Error('bad pdf'));

      await setupAlternateMergeTool();

      expect(ui.showAlert).toHaveBeenCalledWith(
        '错误',
        '无法加载部分 PDF 文件，它们可能已损坏或受密码保护。'
      );
      expect(ui.hideLoader).toHaveBeenCalled();
    });
  });

  describe('alternateMerge()', () => {
    it('should show alert if less than 2 PDFs loaded', async () => {
      // Setup with only 1 file - need to call setup first to populate internal state
      state.files = [new File(['dummy1'], 'file1.pdf')];
      vi.mocked(PDFDocument.load).mockReset();
      vi.mocked(PDFDocument.load).mockResolvedValueOnce(mockPdfDoc1);

      await setupAlternateMergeTool();
      vi.clearAllMocks(); // Clear the setup calls

      await alternateMerge();

      expect(ui.showAlert).toHaveBeenCalledWith(
        '文件数量不足',
        '请至少上传两个 PDF 文件以交替合并。'
      );
    });

    it('should merge pages alternately and download file', async () => {
      // First setup the tool to populate internal state
      await setupAlternateMergeTool();
      vi.clearAllMocks(); // Clear setup calls

      const mockCopyPages = vi.fn(() =>
        Promise.resolve([{ page: 'mockPage' }] as any)
      );
      const mockAddPage = vi.fn();
      const mockSave = vi.fn(() => Promise.resolve(new Uint8Array([1, 2, 3])));

      vi.mocked(PDFDocument.create).mockResolvedValue({
        copyPages: mockCopyPages,
        addPage: mockAddPage,
        save: mockSave,
      } as any);

      const fileList = document.getElementById('alternate-file-list')!;
      // The list should already be populated by setupAlternateMergeTool
      // But ensure it has the correct structure
      fileList.innerHTML = `
        <li data-file-name="file1.pdf"></li>
        <li data-file-name="file2.pdf"></li>
      `;

      await alternateMerge();

      expect(ui.showLoader).toHaveBeenCalledWith('正在交替合并页面...');
      expect(mockCopyPages).toHaveBeenCalled();
      expect(mockAddPage).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
      expect(helpers.downloadFile).toHaveBeenCalled();
      expect(ui.showAlert).toHaveBeenCalledWith('成功', '已成功交替合并这些 PDF！');
      expect(ui.hideLoader).toHaveBeenCalled();
    });

    it('should show alert on merge error', async () => {
      // Setup the tool first to populate internal state with 2 PDFs
      await setupAlternateMergeTool();
      vi.clearAllMocks(); // Clear setup calls

      // Mock PDFDocument.create to reject
      vi.mocked(PDFDocument.create).mockRejectedValue(new Error('broken'));

      await alternateMerge();

      expect(ui.showAlert).toHaveBeenCalledWith(
        '错误',
        '合并 PDF 时发生错误。'
      );
      expect(ui.hideLoader).toHaveBeenCalled();
    });
  });
});
