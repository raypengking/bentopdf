import { showLoader, hideLoader, showAlert } from '../ui.js';
import { downloadFile } from '../utils/helpers.js';
import { state } from '../state.js';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFPageProxy } from 'pdfjs-dist/types/src/display/api.js';

let analysisCache = [];

async function isPageBlank(page: PDFPageProxy, threshold: number) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  const viewport = page.getViewport({ scale: 0.2 });
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport, canvas: canvas })
    .promise;

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const totalPixels = data.length / 4;
  let nonWhitePixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) {
      nonWhitePixels++;
    }
  }

  const blankness = 1 - nonWhitePixels / totalPixels;
  return blankness >= threshold / 100;
}

async function analyzePages() {
  if (!state.pdfDoc) return;
  showLoader('正在分析空白页...');

  const pdfBytes = await state.pdfDoc.save();
  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;

  analysisCache = [];
  const promises = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    promises.push(
      pdf.getPage(i).then((page) =>
        isPageBlank(page, 0).then((isActuallyBlank) => ({
          pageNum: i,
          isInitiallyBlank: isActuallyBlank,
          pageRef: page,
        }))
      )
    );
  }

  analysisCache = await Promise.all(promises);
  hideLoader();
  updateAnalysisUI();
}

async function updateAnalysisUI() {
  const sensitivity = parseInt(
    (document.getElementById('sensitivity-slider') as HTMLInputElement).value
  );
  (
    document.getElementById('sensitivity-value') as HTMLSpanElement
  ).textContent = sensitivity.toString();

  const previewContainer = document.getElementById('analysis-preview');
  const analysisText = document.getElementById('analysis-text');
  const thumbnailsContainer = document.getElementById(
    'removed-pages-thumbnails'
  );

  thumbnailsContainer.innerHTML = '';

  const pagesToRemove = [];

  for (const pageData of analysisCache) {
    const isConsideredBlank = await isPageBlank(pageData.pageRef, sensitivity);
    if (isConsideredBlank) {
      pagesToRemove.push(pageData.pageNum);
    }
  }

  if (pagesToRemove.length > 0) {
    analysisText.textContent = `检测到 ${pagesToRemove.length} 个空白页：${pagesToRemove.join(', ')}`;
    previewContainer.classList.remove('hidden');

    for (const pageNum of pagesToRemove) {
      const pageData = analysisCache[pageNum - 1];
      const viewport = pageData.pageRef.getViewport({ scale: 0.1 });
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = viewport.width;
      thumbCanvas.height = viewport.height;
      await pageData.pageRef.render({
        canvasContext: thumbCanvas.getContext('2d'),
        viewport,
      }).promise;

      const img = document.createElement('img');
      img.src = thumbCanvas.toDataURL();
      img.className = 'rounded border border-gray-600';
      img.title = `第 ${pageNum} 页`;
      thumbnailsContainer.appendChild(img);
    }
  } else {
    analysisText.textContent = '在当前灵敏度下未检测到空白页。';
    previewContainer.classList.remove('hidden');
  }
}

export async function setupRemoveBlankPagesTool() {
  await analyzePages();
  document
    .getElementById('sensitivity-slider')
    .addEventListener('input', updateAnalysisUI);
}

export async function removeBlankPages() {
  showLoader('正在移除空白页...');
  try {
    const sensitivity = parseInt(
      (document.getElementById('sensitivity-slider') as HTMLInputElement).value
    );
    const indicesToKeep = [];

    for (const pageData of analysisCache) {
      const isConsideredBlank = await isPageBlank(
        pageData.pageRef,
        sensitivity
      );
      if (!isConsideredBlank) {
        indicesToKeep.push(pageData.pageNum - 1);
      }
    }

    if (indicesToKeep.length === 0) {
      hideLoader();
      showAlert(
        '未生成新文件',
        '在当前灵敏度设置下所有页面均被判定为空白，因此未创建新文件。如有需要请降低灵敏度后重试。'
      );
      return;
    }

    if (indicesToKeep.length === state.pdfDoc.getPageCount()) {
      hideLoader();
      showAlert('无页被删除', '当前灵敏度下未检测到空白页。');
      return;
    }

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(state.pdfDoc, indicesToKeep);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const newPdfBytes = await newPdf.save();
    downloadFile(
      new Blob([new Uint8Array(newPdfBytes)], { type: 'application/pdf' }),
      'non-blank.pdf'
    );
  } catch (e) {
    console.error(e);
    showAlert('错误', '无法移除空白页。');
  } finally {
    hideLoader();
  }
}
