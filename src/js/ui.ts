import { resetState } from './state.js';
import { formatBytes } from './utils/helpers.js';
import { tesseractLanguages } from './config/tesseract-languages.js';
import { icons, createIcons } from 'lucide';
import Sortable from 'sortablejs';

// Centralizing DOM element selection
export const dom = {
  gridView: document.getElementById('grid-view'),
  toolGrid: document.getElementById('tool-grid'),
  toolInterface: document.getElementById('tool-interface'),
  toolContent: document.getElementById('tool-content'),
  backToGridBtn: document.getElementById('back-to-grid'),
  loaderModal: document.getElementById('loader-modal'),
  loaderText: document.getElementById('loader-text'),
  alertModal: document.getElementById('alert-modal'),
  alertTitle: document.getElementById('alert-title'),
  alertMessage: document.getElementById('alert-message'),
  alertOkBtn: document.getElementById('alert-ok'),
  heroSection: document.getElementById('hero-section'),
  featuresSection: document.getElementById('features-section'),
  toolsHeader: document.getElementById('tools-header'),
  dividers: document.querySelectorAll('.section-divider'),
  hideSections: document.querySelectorAll('.hide-section'),
};

export const showLoader = (text = '正在处理...') => {
  dom.loaderText.textContent = text;
  dom.loaderModal.classList.remove('hidden');
};

export const hideLoader = () => dom.loaderModal.classList.add('hidden');

export const showAlert = (title: any, message: any) => {
  dom.alertTitle.textContent = title;
  dom.alertMessage.textContent = message;
  dom.alertModal.classList.remove('hidden');
};

export const hideAlert = () => dom.alertModal.classList.add('hidden');

export const switchView = (view: any) => {
  if (view === 'grid') {
    dom.gridView.classList.remove('hidden');
    dom.toolInterface.classList.add('hidden');
    // show hero and features and header
    dom.heroSection.classList.remove('hidden');
    dom.featuresSection.classList.remove('hidden');
    dom.toolsHeader.classList.remove('hidden');
    // show dividers
    dom.dividers.forEach((divider) => {
      divider.classList.remove('hidden');
    });
    // show hideSections
    dom.hideSections.forEach((section) => {
      section.classList.remove('hidden');
    });

    resetState();
  } else {
    dom.gridView.classList.add('hidden');
    dom.toolInterface.classList.remove('hidden');
    dom.featuresSection.classList.add('hidden');
    dom.heroSection.classList.add('hidden');
    dom.toolsHeader.classList.add('hidden');
    dom.dividers.forEach((divider) => {
      divider.classList.add('hidden');
    });
    dom.hideSections.forEach((section) => {
      section.classList.add('hidden');
    });
  }
};

const thumbnailState = {
  sortableInstances: {},
};

function initializeOrganizeSortable(containerId: any) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (thumbnailState.sortableInstances[containerId]) {
    thumbnailState.sortableInstances[containerId].destroy();
  }

  thumbnailState.sortableInstances[containerId] = Sortable.create(container, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    filter: '.delete-page-btn',
    preventOnFilter: true,
    onStart: function (evt: any) {
      evt.item.style.opacity = '0.5';
    },
    onEnd: function (evt: any) {
      evt.item.style.opacity = '1';
    },
  });
}

/**
 * Renders page thumbnails for tools like 'Organize' and 'Rotate'.
 * @param {string} toolId The ID of the active tool.
 * @param {object} pdfDoc The loaded pdf-lib document instance.
 */
export const renderPageThumbnails = async (toolId: any, pdfDoc: any) => {
  const containerId = toolId === 'organize' ? 'page-organizer' : 'page-rotator';
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';
  showLoader('正在生成页面预览...');

  const pdfData = await pdfDoc.save();
  // @ts-expect-error TS(2304) FIXME: Cannot find name 'pdfjsLib'.
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 0.5 });
    const canvas = document.createElement('canvas');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport: viewport }).promise;

    const wrapper = document.createElement('div');
    wrapper.className = 'page-thumbnail relative group';
    // @ts-expect-error TS(2322) FIXME: Type 'number' is not assignable to type 'string'.
    wrapper.dataset.pageIndex = i - 1;

    const imgContainer = document.createElement('div');
    imgContainer.className =
      'w-full h-36 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden border-2 border-gray-600';

    const img = document.createElement('img');
    img.src = canvas.toDataURL();
    img.className = 'max-w-full max-h-full object-contain';

    imgContainer.appendChild(img);

    if (toolId === 'organize') {
      wrapper.className = 'page-thumbnail relative group';
      wrapper.appendChild(imgContainer);

      const pageNumSpan = document.createElement('span');
      pageNumSpan.className =
        'absolute top-1 left-1 bg-gray-900 bg-opacity-75 text-white text-xs rounded-full px-2 py-1';
      pageNumSpan.textContent = i.toString();

      const deleteBtn = document.createElement('button');
      deleteBtn.className =
        'delete-page-btn absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.addEventListener('click', (e) => {
        (e.currentTarget as HTMLElement).parentElement.remove();
        initializeOrganizeSortable(containerId);
      });

      wrapper.append(pageNumSpan, deleteBtn);
    } else if (toolId === 'rotate') {
      wrapper.className = 'page-rotator-item flex flex-col items-center gap-2';
      wrapper.dataset.rotation = '0';
      img.classList.add('transition-transform', 'duration-300');
      wrapper.appendChild(imgContainer);

      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'flex items-center justify-center gap-3 w-full';

      const pageNumSpan = document.createElement('span');
      pageNumSpan.className = 'font-medium text-sm text-white';
      pageNumSpan.textContent = i.toString();

      const rotateBtn = document.createElement('button');
      rotateBtn.className =
        'rotate-btn btn bg-gray-700 hover:bg-gray-600 p-2 rounded-full';
      rotateBtn.title = '顺时针旋转 90°';
      rotateBtn.innerHTML = '<i data-lucide="rotate-cw" class="w-5 h-5"></i>';
      rotateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = (e.currentTarget as HTMLElement).closest(
          '.page-rotator-item'
        ) as HTMLElement;
        const imgEl = card.querySelector('img');
        let currentRotation = parseInt(card.dataset.rotation);
        currentRotation = (currentRotation + 90) % 360;
        card.dataset.rotation = currentRotation.toString();
        imgEl.style.transform = `rotate(${currentRotation}deg)`;
      });

      controlsDiv.append(pageNumSpan, rotateBtn);
      wrapper.appendChild(controlsDiv);
    }

    container.appendChild(wrapper);
    createIcons({ icons });
  }

  if (toolId === 'organize') {
    initializeOrganizeSortable(containerId);
  }

  hideLoader();
};

/**
 * Renders a list of uploaded files in the specified container.
 * @param {HTMLElement} container The DOM element to render the list into.
 * @param {File[]} files The array of file objects.
 */
export const renderFileDisplay = (container: any, files: any) => {
  container.textContent = '';
  if (files.length > 0) {
    files.forEach((file: any) => {
      const fileDiv = document.createElement('div');
      fileDiv.className =
        'flex items-center justify-between bg-gray-700 p-3 rounded-lg text-sm';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'truncate font-medium text-gray-200';
      nameSpan.textContent = file.name;

      const sizeSpan = document.createElement('span');
      sizeSpan.className = 'flex-shrink-0 ml-4 text-gray-400';
      sizeSpan.textContent = formatBytes(file.size);

      fileDiv.append(nameSpan, sizeSpan);
      container.appendChild(fileDiv);
    });
  }
};

const createFileInputHTML = (options = {}) => {
  // @ts-expect-error TS(2339) FIXME: Property 'multiple' does not exist on type '{}'.
  const multiple = options.multiple ? 'multiple' : '';
  // @ts-expect-error TS(2339) FIXME: Property 'accept' does not exist on type '{}'.
  const acceptedFiles = options.accept || 'application/pdf';
  // @ts-expect-error TS(2339) FIXME: Property 'showControls' does not exist on type '{}... Remove this comment to see the full error message
  const showControls = options.showControls || false; // NEW: Add this parameter

  return `
        <div id="drop-zone" class="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer bg-gray-900 hover:bg-gray-700 transition-colors duration-300">
            <div class="flex flex-col items-center justify-center pt-5 pb-6">
                <i data-lucide="upload-cloud" class="w-10 h-10 mb-3 text-gray-400"></i>
                <p class="mb-2 text-sm text-gray-400"><span class="font-semibold">点击选择文件</span>，或直接拖拽到此处</p>
                <p class="text-xs text-gray-500">${multiple ? '支持上传多个 PDF 或图片' : '支持上传单个 PDF 文件'}</p>
                <p class="text-xs text-gray-500">所有操作均在本地完成，文件不会被上传。</p>
            </div>
            <input id="file-input" type="file" class="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" ${multiple} accept="${acceptedFiles}">
        </div>
        
        ${
          showControls
            ? `
            <!-- NEW: Add control buttons for multi-file uploads -->
            <div id="file-controls" class="hidden mt-4 flex gap-3">
                <button id="add-more-btn" class="btn bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2">
                    <i data-lucide="plus"></i> 继续添加文件
                </button>
                <button id="clear-files-btn" class="btn bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2">
                    <i data-lucide="x"></i> 清除全部
                </button>
            </div>
        `
            : ''
        }
    `;
};

export const toolTemplates = {
  merge: () => `
    <h2 class="text-2xl font-bold text-white mb-4">合并 PDF</h2>
    <p class="mb-6 text-gray-400">将多份文件或指定页面合并成一个新的 PDF。</p>
    ${createFileInputHTML({ multiple: true, showControls: true })}

    <div id="merge-options" class="hidden mt-6">
        <div class="flex gap-2 p-1 rounded-lg bg-gray-900 border border-gray-700 mb-4">
            <button id="file-mode-btn" class="flex-1 btn bg-indigo-600 text-white font-semibold py-2 rounded-md">按文件模式</button>
            <button id="page-mode-btn" class="flex-1 btn text-gray-300 font-semibold py-2 rounded-md">按页面模式</button>
        </div>

        <div id="file-mode-panel">
            <div class="p-3 bg-gray-900 rounded-lg border border-gray-700 mb-3">
                <p class="text-sm text-gray-300"><strong class="text-white">使用说明：</strong></p>
                <ul class="list-disc list-inside text-xs text-gray-400 mt-1 space-y-1">
                    <li>拖动 <i data-lucide="grip-vertical" class="inline-block w-3 h-3"></i> 图标即可调整文件顺序。</li>
                    <li>在每个文件的“页面”输入框填写范围（如“1-3, 5”）即可只合并部分页面。</li>
                    <li>留空“页面”输入框则会合并该文件的全部页面。</li>
                </ul>
            </div>
            <ul id="file-list" class="space-y-2"></ul>
        </div>

        <div id="page-mode-panel" class="hidden">
             <div class="p-3 bg-gray-900 rounded-lg border border-gray-700 mb-3">
                <p class="text-sm text-gray-300"><strong class="text-white">使用说明：</strong></p>
                 <ul class="list-disc list-inside text-xs text-gray-400 mt-1 space-y-1">
                    <li>下方会显示所有已上传文件的页面缩略图。</li>
                    <li>拖动单个页面即可整理出想要的顺序。</li>
                </ul>
            </div>
             <div id="page-merge-preview" class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 p-4 bg-gray-900 rounded-lg border border-gray-700 min-h-[200px]"></div>
        </div>

        <button id="process-btn" class="btn-gradient w-full mt-6" disabled>开始合并</button>
    </div>
`,

  split: () => `
    <h2 class="text-2xl font-bold text-white mb-4">拆分 PDF</h2>
    <p class="mb-6 text-gray-400">通过多种方式提取或拆分 PDF 页面。</p>
    ${createFileInputHTML()}
    <div id="file-display-area" class="mt-4 space-y-2"></div>
    <div id="split-options" class="hidden mt-6">

        <label for="split-mode" class="block mb-2 text-sm font-medium text-gray-300">拆分方式</label>
        <select id="split-mode" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5 mb-4">
            <option value="range">按页面范围提取（默认）</option>
            <option value="even-odd">按奇偶页拆分</option>
            <option value="all">每页生成独立文件</option>
            <option value="visual">手动勾选页面</option>
        </select>

        <div id="range-panel">
            <div class="p-3 bg-gray-900 rounded-lg border border-gray-700 mb-3">
                <p class="text-sm text-gray-300"><strong class="text-white">使用说明：</strong></p>
                <ul class="list-disc list-inside text-xs text-gray-400 mt-1 space-y-1">
                    <li>用逗号分隔单个页面（示例：2, 8, 14）。</li>
                    <li>使用短横线表示范围（示例：5-10）。</li>
                    <li>两者结合可完成复杂选择（示例：1-3, 7, 12-15）。</li>
                </ul>
            </div>
            <p class="mb-2 font-medium text-white">总页数：<span id="total-pages"></span></p>
            <label for="page-range" class="block mb-2 text-sm font-medium text-gray-300">输入页码范围：</label>
            <input type="text" id="page-range" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5" placeholder="例如：1-5, 8">
        </div>

        <div id="even-odd-panel" class="hidden">
            <div class="p-3 bg-gray-900 rounded-lg border border-gray-700 mb-3">
                <p class="text-sm text-gray-300"><strong class="text-white">使用说明：</strong></p>
                <p class="text-xs text-gray-400 mt-1">将生成仅包含奇数页或偶数页的新 PDF。</p>
            </div>
            <div class="flex gap-4">
                <label class="flex-1 flex items-center justify-center gap-2 p-3 rounded-md hover:bg-gray-700 cursor-pointer has-[:checked]:bg-indigo-600">
                    <input type="radio" name="even-odd-choice" value="odd" checked class="hidden">
                    <span class="font-semibold text-white">仅保留奇数页</span>
                </label>
                <label class="flex-1 flex items-center justify-center gap-2 p-3 rounded-md hover:bg-gray-700 cursor-pointer has-[:checked]:bg-indigo-600">
                    <input type="radio" name="even-odd-choice" value="even" class="hidden">
                    <span class="font-semibold text-white">仅保留偶数页</span>
                </label>
            </div>
        </div>

        <div id="visual-select-panel" class="hidden">
             <div class="p-3 bg-gray-900 rounded-lg border border-gray-700 mb-3">
                <p class="text-sm text-gray-300"><strong class="text-white">使用说明：</strong></p>
                <p class="text-xs text-gray-400 mt-1">点击下方页面缩略图即可选择，再次点击可取消，所有选中的页面都会导出。</p>
            </div>
             <div id="page-selector-grid" class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 p-4 bg-gray-900 rounded-lg border border-gray-700 min-h-[150px]"></div>
        </div>

        <div id="all-pages-panel" class="hidden p-3 bg-gray-900 rounded-lg border border-gray-700">
            <p class="text-sm text-gray-300"><strong class="text-white">使用说明：</strong></p>
            <p class="text-xs text-gray-400 mt-1">该模式会为每一页生成独立 PDF，并打包成 ZIP 下载。</p>
        </div>

        <div id="zip-option-wrapper" class="hidden mt-4">
            <label class="flex items-center gap-2 text-sm font-medium text-gray-300">
                <input type="checkbox" id="download-as-zip" class="w-4 h-4 rounded text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500">
                以 ZIP 打包下载单页文件
            </label>
        </div>

        <button id="process-btn" class="btn-gradient w-full mt-6">拆分 PDF</button>

    </div>
`,
  encrypt: () => `
        <h2 class="text-2xl font-bold text-white mb-4">加密 PDF</h2>
        <p class="mb-6 text-gray-400">上传 PDF，生成新的密码保护版本。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <div id="encrypt-options" class="hidden space-y-4 mt-6">
            <div>
                <label for="password-input" class="block mb-2 text-sm font-medium text-gray-300">设置访问密码</label>
                <input type="password" id="password-input" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5" placeholder="请输入安全密码">
            </div>
            <div class="p-4 bg-gray-900 border border-yellow-500/30 text-yellow-200 rounded-lg">
                <h3 class="font-semibold text-base mb-2">温馨提示</h3>
                <p class="text-sm text-gray-400">为保证安全性，系统会将每一页转换为图片，因此最终文件中的文字将无法选中或点击链接。</p>
            </div>
            <button id="process-btn" class="btn-gradient w-full mt-6">加密并下载</button>
        </div>
        <canvas id="pdf-canvas" class="hidden"></canvas>
    `,
  decrypt: () => `
        <h2 class="text-2xl font-bold text-white mb-4">解密 PDF</h2>
        <p class="mb-6 text-gray-400">上传加密的 PDF，输入密码即可生成解锁版本。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <div id="decrypt-options" class="hidden space-y-4 mt-6">
            <div>
                <label for="password-input" class="block mb-2 text-sm font-medium text-gray-300">输入原始密码</label>
                <input type="password" id="password-input" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5" placeholder="请输入当前密码">
            </div>
            <button id="process-btn" class="btn-gradient w-full mt-6">解密并下载</button>
        </div>
        <canvas id="pdf-canvas" class="hidden"></canvas>
    `,
  organize: () => `
        <h2 class="text-2xl font-bold text-white mb-4">整理 PDF</h2>
        <p class="mb-6 text-gray-400">通过拖拽调整顺序、旋转或删除页面。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <div id="page-organizer" class="hidden grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 my-6"></div>
        <button id="process-btn" class="btn-gradient w-full mt-6">保存更改</button>
    `,

  rotate: () => `
        <h2 class="text-2xl font-bold text-white mb-4">旋转 PDF</h2>
        <p class="mb-6 text-gray-400">支持旋转全部页面或指定页面。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>

        <div id="rotate-all-controls" class="hidden my-6">
            <div class="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                <h3 class="text-sm font-semibold text-gray-400 mb-3 text-center">批量操作</h3>
                <div class="flex justify-center gap-4">
                    <button id="rotate-all-left-btn" class="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-200 bg-gray-800 border border-gray-600 rounded-lg shadow-sm hover:bg-gray-700 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transform transition-all duration-150 active:scale-95">
                        <i data-lucide="rotate-ccw" class="mr-2 h-4 w-4"></i>
                        全部向左旋转
                    </button>
                    <button id="rotate-all-right-btn" class="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-200 bg-gray-800 border border-gray-600 rounded-lg shadow-sm hover:bg-gray-700 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transform transition-all duration-150 active:scale-95">
                        <i data-lucide="rotate-cw" class="mr-2 h-4 w-4"></i>
                        全部向右旋转
                    </button>
                </div>
            </div>
        </div>
        <div id="page-rotator" class="hidden grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 my-6"></div>
        <button id="process-btn" class="btn-gradient w-full mt-6">保存旋转结果</button>
    `,

  'add-page-numbers': () => `
        <h2 class="text-2xl font-bold text-white mb-4">添加页码</h2>
        <p class="mb-6 text-gray-400">为 PDF 添加可自定义的页码样式。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <div id="pagenum-options" class="hidden grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div>
                <label for="position" class="block mb-2 text-sm font-medium text-gray-300">位置</label>
                <select id="position" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                    <option value="bottom-center">底部居中</option>
                    <option value="bottom-left">底部居左</option>
                    <option value="bottom-right">底部居右</option>
                    <option value="top-center">顶部居中</option>
                    <option value="top-left">顶部居左</option>
                    <option value="top-right">顶部居右</option>
                </select>
            </div>
            <div>
                <label for="font-size" class="block mb-2 text-sm font-medium text-gray-300">字号</label>
                <input type="number" id="font-size" value="12" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
            </div>
            <div>
                <label for="number-format" class="block mb-2 text-sm font-medium text-gray-300">格式</label>
                <select id="number-format" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                    <option value="default">1, 2, 3...</option>
                    <option value="page_x_of_y">第 1/N、2/N…</option>
                </select>
            </div>
            <div>
                <label for="text-color" class="block mb-2 text-sm font-medium text-gray-300">文本颜色</label>
                <input type="color" id="text-color" value="#000000" class="w-full h-[42px] bg-gray-700 border border-gray-600 rounded-lg p-1 cursor-pointer">
            </div>
        </div>
        <button id="process-btn" class="btn-gradient w-full mt-6">添加页码</button>
    `,
  'pdf-to-jpg': () => `
        <h2 class="text-2xl font-bold text-white mb-4">PDF 转 JPG</h2>
        <p class="mb-6 text-gray-400">将 PDF 每页导出为高质量 JPG 图像。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <div id="jpg-preview" class="hidden text-center mt-6">
            <p class="mb-4 text-white">点击“全部下载为 ZIP”即可获取所有页面的图像。</p>
            <button id="process-btn" class="btn-gradient w-full mt-6">全部下载为 ZIP</button>
        </div>
    `,
  'jpg-to-pdf': () => `
        <h2 class="text-2xl font-bold text-white mb-4">JPG 转 PDF</h2>
        <p class="mb-6 text-gray-400">将一张或多张 JPG 图片合成为一个 PDF。</p>
        ${createFileInputHTML({ multiple: true, accept: 'image/jpeg', showControls: true })}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <button id="process-btn" class="btn-gradient w-full mt-6">转换为 PDF</button>
    `,
  'scan-to-pdf': () => `
        <h2 class="text-2xl font-bold text-white mb-4">扫描成 PDF</h2>
        <p class="mb-6 text-gray-400">使用设备摄像头扫描并保存为 PDF；桌面端将打开文件选择器。</p>
        ${createFileInputHTML({ accept: 'image/*' })}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <button id="process-btn" class="btn-gradient w-full mt-6">由扫描件生成 PDF</button>
    `,

  crop: () => `
    <h2 class="text-2xl font-bold text-white mb-4">裁剪 PDF</h2>
    <p class="mb-6 text-gray-400">拖动即可框选裁剪区域，每一页都可以设置不同的裁剪范围。</p>
    ${createFileInputHTML()}
    <div id="crop-editor" class="hidden">
        <div class="flex flex-col md:flex-row items-center justify-center gap-4 mb-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
            <div id="page-nav" class="flex items-center gap-2"></div>
            <div class="border-l border-gray-600 h-6 mx-2 hidden md:block"></div>
            <div id="zoom-controls" class="flex items-center gap-2">
                <button id="zoom-out-btn" class="btn p-2 rounded-full bg-gray-700 hover:bg-gray-600" title="缩小"><i data-lucide="zoom-out" class="w-5 h-5"></i></button>
                <button id="fit-page-btn" class="btn p-2 rounded-full bg-gray-700 hover:bg-gray-600" title="适应屏幕"><i data-lucide="minimize" class="w-5 h-5"></i></button>
                <button id="zoom-in-btn" class="btn p-2 rounded-full bg-gray-700 hover:bg-gray-600" title="放大"><i data-lucide="zoom-in" class="w-5 h-5"></i></button>
            </div>
             <div class="border-l border-gray-600 h-6 mx-2 hidden md:block"></div>
            <div id="crop-controls" class="flex items-center gap-2">
                 <button id="clear-crop-btn" class="btn bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-4 py-2 rounded-lg text-sm" title="清除此页裁剪">清除此页设置</button>
                 <button id="clear-all-crops-btn" class="btn bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg text-sm" title="清除全部裁剪">全部清除</button>
            </div>
        </div>
        <div id="canvas-container" class="relative w-full overflow-auto bg-gray-900 rounded-lg border border-gray-600" style="height: 70vh;">
            <canvas id="canvas-editor" class="mx-auto cursor-crosshair"></canvas>
        </div>
        <button id="process-btn" class="btn-gradient w-full mt-6">应用裁剪并保存 PDF</button>
    </div>
`,
  compress: () => `
    <h2 class="text-2xl font-bold text-white mb-4">压缩 PDF</h2>
    <p class="mb-6 text-gray-400">根据文档特点选择压缩方式以减小文件大小。</p>
    ${createFileInputHTML()}
    <div id="file-display-area" class="mt-4 space-y-2"></div>
    <div id="compress-options" class="hidden mt-6 space-y-6">
        <div>
            <label for="compression-level" class="block mb-2 text-sm font-medium text-gray-300">压缩强度</label>
            <select id="compression-level" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500">
                <option value="balanced">均衡压缩（推荐）</option>
                <option value="high-quality">高质量（文件较大）</option>
                <option value="small-size">最小体积（较低质量）</option>
                <option value="extreme">极限压缩（质量最低）</option>
            </select>
        </div>

        <div>
            <label for="compression-algorithm" class="block mb-2 text-sm font-medium text-gray-300">压缩算法</label>
            <select id="compression-algorithm" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500">
                <option value="vector">Vector（适合文字较多）</option>
                <option value="photon">Photon（适合复杂图像）</option>
            </select>
            <p class="mt-2 text-xs text-gray-400">文本型 PDF 建议选择“Vector”，扫描件或复杂图像建议使用“Photon”。
            </p>
        </div>

        <button id="process-btn" class="btn-gradient w-full mt-4" disabled>压缩 PDF</button>
    </div>
`,
  'pdf-to-greyscale': () => `
        <h2 class="text-2xl font-bold text-white mb-4">PDF 转灰度</h2>
        <p class="mb-6 text-gray-400">把整份 PDF 转换为灰度，通过渲染页面、应用滤镜再重新生成。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <button id="process-btn" class="btn-gradient w-full mt-6">转换为灰度</button>
    `,
  'pdf-to-zip': () => `
        <h2 class="text-2xl font-bold text-white mb-4">PDF 合并打包为 ZIP</h2>
        <p class="mb-6 text-gray-400">选择多个 PDF 并打包成一个 ZIP 下载。</p>
        ${createFileInputHTML({ multiple: true, showControls: true })}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <button id="process-btn" class="btn-gradient w-full mt-6">创建 ZIP 文件</button>
    `,

  'edit-metadata': () => `
    <h2 class="text-2xl font-bold text-white mb-4">编辑 PDF 元数据</h2>
    <p class="mb-6 text-gray-400">编辑 PDF 核心元数据，留空即可清除对应字段。</p>
    
    <div class="p-3 mb-6 bg-gray-900 border border-yellow-500/30 text-yellow-200/80 rounded-lg text-sm flex items-start gap-3">
        <i data-lucide="info" class="w-5 h-5 flex-shrink-0 mt-0.5"></i>
        <div>
            <strong class="font-semibold text-yellow-200">重要提示：</strong>此工具 <code class="bg-gray-700 px-1 rounded text-white">pdf-lib</code>库，该库在上传时可能会更新 <strong>生产者</strong>, <strong>CreationDate</strong>，以及 <strong>ModDate</strong>字段，因上传时的默认行为可能被更新。若需准确查看编辑后的最终元数据，或正常浏览，请使用我们的 <strong>查看元数据</strong>工具。
        </div>
    </div>

    ${createFileInputHTML()}
    
    <div id="metadata-form" class="hidden mt-6 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label for="meta-title" class="block mb-2 text-sm font-medium text-gray-300">标题</label>
                <input type="text" id="meta-title" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
            </div>
            <div>
                <label for="meta-author" class="block mb-2 text-sm font-medium text-gray-300">作者</label>
                <input type="text" id="meta-author" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
            </div>
            <div>
                <label for="meta-subject" class="block mb-2 text-sm font-medium text-gray-300">主题</label>
                <input type="text" id="meta-subject" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
            </div>
             <div>
                <label for="meta-keywords" class="block mb-2 text-sm font-medium text-gray-300">关键词（以逗号分隔）</label>
                <input type="text" id="meta-keywords" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
            </div>
            <div>
                <label for="meta-creator" class="block mb-2 text-sm font-medium text-gray-300">创建工具</label>
                <input type="text" id="meta-creator" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
            </div>
            <div>
                <label for="meta-producer" class="block mb-2 text-sm font-medium text-gray-300">生产工具</label>
                <input type="text" id="meta-producer" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
            </div>
             <div>
                <label for="meta-creation-date" class="block mb-2 text-sm font-medium text-gray-300">创建日期</label>
                <input type="datetime-local" id="meta-creation-date" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
            </div>
            <div>
                <label for="meta-mod-date" class="block mb-2 text-sm font-medium text-gray-300">修改日期</label>
                <input type="datetime-local" id="meta-mod-date" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
            </div>
        </div>

        <div id="custom-metadata-container" class="space-y-3 pt-4 border-t border-gray-700">
             <h3 class="text-lg font-semibold text-white">自定义字段</h3>
             <p class="text-sm text-gray-400 -mt-2">注意：并非所有 PDF 阅读器都支持自定义字段。</p>
        </div>
        <button id="add-custom-meta-btn" class="btn border border-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2">
            <i data-lucide="plus"></i>添加自定义字段
        </button>
        
    </div>

    <button id="process-btn" class="hidden btn-gradient w-full mt-6">更新元数据并下载</button>
`,

  'remove-metadata': () => `
        <h2 class="text-2xl font-bold text-white mb-4">移除 PDF 元数据</h2>
        <p class="mb-6 text-gray-400">彻底清除 PDF 的识别信息元数据。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <button id="process-btn" class="hidden mt-6 btn-gradient w-full">移除元数据并下载</button>
    `,
  flatten: () => `
        <h2 class="text-2xl font-bold text-white mb-4">扁平化 PDF</h2>
        <p class="mb-6 text-gray-400">通过扁平化使表单和批注不可再编辑。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <button id="process-btn" class="hidden mt-6 btn-gradient w-full">扁平化 PDF</button>
    `,
  'pdf-to-png': () => `
        <h2 class="text-2xl font-bold text-white mb-4">PDF 转 PNG</h2>
        <p class="mb-6 text-gray-400">将 PDF 每页导出为高质量 PNG 图像。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <div id="png-preview" class="hidden text-center mt-6">
            <p class="mb-4 text-white">文件已准备就绪，点击按钮即可下载包含所有 PNG 图像的 ZIP。</p>
            <button id="process-btn" class="btn-gradient w-full">全部下载为 ZIP</button>
        </div>
    `,
  'png-to-pdf': () => `
        <h2 class="text-2xl font-bold text-white mb-4">PNG 转 PDF</h2>
        <p class="mb-6 text-gray-400">将一张或多张 PNG 图片合成为一个 PDF。</p>
        ${createFileInputHTML({ multiple: true, accept: 'image/png', showControls: true })}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <button id="process-btn" class="btn-gradient w-full mt-6">转换为 PDF</button>
    `,
  'pdf-to-webp': () => `
        <h2 class="text-2xl font-bold text-white mb-4">PDF 转 WebP</h2>
        <p class="mb-6 text-gray-400">将 PDF 每页导出为 WebP 图像。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <div id="webp-preview" class="hidden text-center mt-6">
            <p class="mb-4 text-white">文件已准备就绪，点击按钮即可下载包含所有 WebP 图像的 ZIP。</p>
            <button id="process-btn" class="btn-gradient w-full">全部下载为 ZIP</button>
        </div>
    `,
  'webp-to-pdf': () => `
        <h2 class="text-2xl font-bold text-white mb-4">WebP 转 PDF</h2>
        <p class="mb-6 text-gray-400">将一张或多张 WebP 图片合成为一个 PDF。</p>
        ${createFileInputHTML({ multiple: true, accept: 'image/webp', showControls: true })}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <button id="process-btn" class="btn-gradient w-full mt-6">转换为 PDF</button>
    `,
  edit: () => `
        <h2 class="text-2xl font-bold text-white mb-4">PDF 工作室</h2>
        <p class="mb-6 text-gray-400">多合一 PDF 工作台，可批注、绘图、涂黑、评论、添加形状、截图并查看文档。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <div id="embed-pdf-wrapper" class="hidden mt-6 w-full h-[75vh] border border-gray-600 rounded-lg">
            <div id="embed-pdf-container" class="w-full h-full"></div>
        </div>
    `,
  'delete-pages': () => `
        <h2 class="text-2xl font-bold text-white mb-4">删除页面</h2>
        <p class="mb-6 text-gray-400">删除 PDF 中的特定页面或页面范围。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <div id="delete-options" class="hidden mt-6">
            <p class="mb-2 font-medium text-white">总页数： <span id="total-pages"></span></p>
            <label for="pages-to-delete" class="block mb-2 text-sm font-medium text-gray-300">输入要删除的页面（例如：2, 4-6, 9）：</label>
            <input type="text" id="pages-to-delete" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5 mb-6" placeholder="例如：2, 4-6, 9">
            <button id="process-btn" class="btn-gradient w-full">删除页面并下载</button>
        </div>
    `,
  'add-blank-page': () => `
        <h2 class="text-2xl font-bold text-white mb-4">添加空白页</h2>
        <p class="mb-6 text-gray-400">在文档指定位置插入一页或多页空白页。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <div id="blank-page-options" class="hidden mt-6">
            <p class="mb-2 font-medium text-white">总页数： <span id="total-pages"></span></p>
            <label for="page-number" class="block mb-2 text-sm font-medium text-gray-300">在以下页码后插入空白页：</label>
            <input type="number" id="page-number" min="0" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5 mb-4" placeholder="输入 0 即可插入到文档开头">
            <label for="page-count" class="block mb-2 text-sm font-medium text-gray-300">插入空白页的数量：</label>
            <input type="number" id="page-count" min="1" value="1" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5 mb-6" placeholder="请输入页数">
            <button id="process-btn" class="btn-gradient w-full">添加页面并下载</button>
        </div>
    `,
  'extract-pages': () => `
        <h2 class="text-2xl font-bold text-white mb-4">提取页面</h2>
        <p class="mb-6 text-gray-400">将选定页面导出为单独文件，并打包成 ZIP 下载。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <div id="extract-options" class="hidden mt-6">
            <p class="mb-2 font-medium text-white">总页数： <span id="total-pages"></span></p>
            <label for="pages-to-extract" class="block mb-2 text-sm font-medium text-gray-300">输入要导出的页面（例如：2, 4-6, 9）：</label>
            <input type="text" id="pages-to-extract" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5 mb-6" placeholder="例如：2, 4-6, 9">
            <button id="process-btn" class="btn-gradient w-full">导出并下载 ZIP</button>
        </div>
    `,

  'add-watermark': () => `
    <h2 class="text-2xl font-bold text-white mb-4">添加水印</h2>
    <p class="mb-6 text-gray-400">在 PDF 每一页加入文字或图片水印。</p>
    ${createFileInputHTML()}
    <div id="file-display-area" class="mt-4 space-y-2"></div>

    <div id="watermark-options" class="hidden mt-6 space-y-4">
        <div class="flex gap-4 p-2 rounded-lg bg-gray-900">
            <label class="flex-1 flex items-center justify-center gap-2 p-3 rounded-md hover:bg-gray-700 cursor-pointer has-[:checked]:bg-indigo-600">
                <input type="radio" name="watermark-type" value="text" checked class="hidden">
                <span class="font-semibold text-white">文本</span>
            </label>
            <label class="flex-1 flex items-center justify-center gap-2 p-3 rounded-md hover:bg-gray-700 cursor-pointer has-[:checked]:bg-indigo-600">
                <input type="radio" name="watermark-type" value="image" class="hidden">
                <span class="font-semibold text-white">图像</span>
            </label>
        </div>

        <div id="text-watermark-options">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="watermark-text" class="block mb-2 text-sm font-medium text-gray-300">水印文字</label>
                    <input type="text" id="watermark-text" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5" placeholder="例如：CONFIDENTIAL">
                </div>
                <div>
                    <label for="font-size" class="block mb-2 text-sm font-medium text-gray-300">字号</label>
                    <input type="number" id="font-size" value="72" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                </div>
            </div>
             <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                    <label for="text-color" class="block mb-2 text-sm font-medium text-gray-300">文本颜色</label>
                    <input type="color" id="text-color" value="#000000" class="w-full h-[42px] bg-gray-700 border border-gray-600 rounded-lg p-1 cursor-pointer">
                </div>
                <div>
                    <label for="opacity-text" class="block mb-2 text-sm font-medium text-gray-300">不透明度（<span id="opacity-value-text">0.3</span>)</label>
                    <input type="range" id="opacity-text" value="0.3" min="0" max="1" step="0.1" class="w-full">
                </div>
            </div>
            <div class="mt-4">
                <label for="angle-text" class="block mb-2 text-sm font-medium text-gray-300">旋转角度（<span id="angle-value-text">0</span>°)</label>
                <input type="range" id="angle-text" value="0" min="-180" max="180" step="1" class="w-full">
            </div>
        </div>

        <div id="image-watermark-options" class="hidden space-y-4">
            <div>
                <label for="image-watermark-input" class="block mb-2 text-sm font-medium text-gray-300">上传水印图片</label>
                <input type="file" id="image-watermark-input" accept="image/png, image/jpeg" class="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700">
            </div>
            <div>
                <label for="opacity-image" class="block mb-2 text-sm font-medium text-gray-300">不透明度（<span id="opacity-value-image">0.3</span>)</label>
                <input type="range" id="opacity-image" value="0.3" min="0" max="1" step="0.1" class="w-full">
            </div>
            <div>
                <label for="angle-image" class="block mb-2 text-sm font-medium text-gray-300">旋转角度（<span id="angle-value-image">0</span>°)</label>
                <input type="range" id="angle-image" value="0" min="-180" max="180" step="1" class="w-full">
            </div>
        </div>

    </div>
    <button id="process-btn" class="hidden btn-gradient w-full mt-6">应用水印并下载</button>
`,

  'add-header-footer': () => `
    <h2 class="text-2xl font-bold text-white mb-4">添加页眉页脚</h2>
    <p class="mb-6 text-gray-400">为每页顶部和底部添加自定义文本。</p>
    ${createFileInputHTML()}
    <div id="file-display-area" class="mt-4 space-y-2"></div>
    <div id="header-footer-options" class="hidden mt-6 space-y-4">
        
        <div class="p-4 bg-gray-900 border border-gray-700 rounded-lg">
            <h3 class="text-lg font-semibold text-white mb-3">排版选项</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label for="page-range" class="block mb-2 text-sm font-medium text-gray-300">页码范围（可选）</label>
            <input type="text" id="page-range" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5" placeholder="例如：1-3, 5">
                    <p class="text-xs text-gray-400 mt-1">总页数： <span id="total-pages">0</span></p>
                </div>
                <div>
                    <label for="font-size" class="block mb-2 text-sm font-medium text-gray-300">字号</label>
                    <input type="number" id="font-size" value="10" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                </div>
                <div>
                    <label for="font-color" class="block mb-2 text-sm font-medium text-gray-300">文字颜色</label>
                    <input type="color" id="font-color" value="#000000" class="w-full h-[42px] bg-gray-700 border border-gray-600 rounded-lg p-1 cursor-pointer">
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label for="header-left" class="block mb-2 text-sm font-medium text-gray-300">页眉居左</label>
                <input type="text" id="header-left" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
            </div>
            <div>
                <label for="header-center" class="block mb-2 text-sm font-medium text-gray-300">页眉居中</label>
                <input type="text" id="header-center" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
            </div>
            <div>
                <label for="header-right" class="block mb-2 text-sm font-medium text-gray-300">页眉居右</label>
                <input type="text" id="header-right" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label for="footer-left" class="block mb-2 text-sm font-medium text-gray-300">页脚居左</label>
                <input type="text" id="footer-left" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
            </div>
            <div>
                <label for="footer-center" class="block mb-2 text-sm font-medium text-gray-300">页脚居中</label>
                <input type="text" id="footer-center" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
            </div>
            <div>
                <label for="footer-right" class="block mb-2 text-sm font-medium text-gray-300">页脚居右</label>
                <input type="text" id="footer-right" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
            </div>
        </div>
    </div>
    <button id="process-btn" class="hidden btn-gradient w-full mt-6">应用页眉页脚</button>
`,

  'image-to-pdf': () => `
        <h2 class="text-2xl font-bold text-white mb-4">图片转 PDF 工具</h2>
        <p class="mb-6 text-gray-400">将多张图片合成为一个 PDF，可通过拖拽调整顺序。</p>
        ${createFileInputHTML({ multiple: true, accept: 'image/jpeg,image/png,image/webp', showControls: true })}
        <ul id="image-list" class="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4"></ul>
        <button id="process-btn" class="btn-gradient w-full mt-6">转换为 PDF</button>
    `,

  'change-permissions': () => `
    <h2 class="text-2xl font-bold text-white mb-4">调整 PDF 权限</h2>
    <p class="mb-6 text-gray-400">解锁 PDF 并以新的密码与权限重新保存。</p>
    ${createFileInputHTML()}
    <div id="file-display-area" class="mt-4 space-y-2"></div>
    <div id="permissions-options" class="hidden mt-6 space-y-4">
        <div>
            <label for="current-password" class="block mb-2 text-sm font-medium text-gray-300">当前密码（用于解锁）</label>
            <input type="password" id="current-password" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5" placeholder="请输入当前密码以解锁文件">
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label for="new-user-password" class="block mb-2 text-sm font-medium text-gray-300">新的用户密码（可选）</label>
                <input type="password" id="new-user-password" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5" placeholder="用于打开文件的密码">
            </div>
            <div>
                <label for="new-owner-password" class="block mb-2 text-sm font-medium text-gray-300">新的拥有者密码（可选）</label>
                <input type="password" id="new-owner-password" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5" placeholder="用于权限控制的管理员密码">
            </div>
        </div>

        <div class="p-4 bg-gray-900 border border-blue-500/30 text-blue-200 rounded-lg">
            <h3 class="font-semibold text-base mb-2">密码说明</h3>
            <ul class="list-disc list-inside text-sm text-gray-400 space-y-1">
                <li>此 <strong>用户密码</strong>用于打开并解密 PDF。</li>
                <li>此 <strong>拥有者密码</strong>是管理员密钥，可绕过所有权限限制。</li>
                <li>若两项均留空，将生成无密码的 PDF。</li>
                <li>设置拥有者密码以生效下方的权限限制。</li>
            </ul>
        </div>
        
        <fieldset class="border border-gray-600 p-4 rounded-lg">
            <legend class="px-2 text-sm font-medium text-gray-300">允许阅读者执行以下操作：</legend>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <label class="flex items-center gap-2"><input type="checkbox" id="allow-printing" checked class="checkbox-style">允许打印文档</label>
                <label class="flex items-center gap-2"><input type="checkbox" id="allow-copying" checked class="checkbox-style">复制内容</label>
                <label class="flex items-center gap-2"><input type="checkbox" id="allow-modifying" checked class="checkbox-style">允许修改文档</label>
                <label class="flex items-center gap-2"><input type="checkbox" id="allow-annotating" checked class="checkbox-style">批注与评论</label>
                <label class="flex items-center gap-2"><input type="checkbox" id="allow-filling-forms" checked class="checkbox-style">填写表单</label>
                <label class="flex items-center gap-2"><input type="checkbox" id="allow-content-accessibility" checked class="checkbox-style">允许内容辅助功能</label>
                <label class="flex items-center gap-2"><input type="checkbox" id="allow-document-assembly" checked class="checkbox-style">允许重新编排页面</label>
            </div>
        </fieldset>
    </div>
    <button id="process-btn" class="hidden btn-gradient w-full mt-6">保存权限设置</button>
`,

  'pdf-to-markdown': () => `
        <h2 class="text-2xl font-bold text-white mb-4">PDF 转 Markdown</h2>
        <p class="mb-6 text-gray-400">将 PDF 的文本内容转成 Markdown 结构。</p>
        ${createFileInputHTML({ accept: '.pdf' })}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <div class="hidden mt-4 p-3 bg-gray-900 border border-yellow-500/30 text-yellow-200 rounded-lg" id="quality-note">
            <p class="text-sm text-gray-400"><b>注意：</b>此转换仅保留文本，不包含表格与图片。</p>
        </div>
        <button id="process-btn" class="hidden btn-gradient w-full mt-6">转换为 Markdown</button>
    `,
  'txt-to-pdf': () => `
        <h2 class="text-2xl font-bold text-white mb-4">文本转 PDF</h2>
        <p class="mb-6 text-gray-400">在下方输入或粘贴文本，可自定义格式后导出为 PDF。</p>
        <textarea id="text-input" rows="12" class="w-full bg-gray-900 border border-gray-600 text-gray-300 rounded-lg p-2.5 font-sans" placeholder="在此开始输入…"></textarea>
        <div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
                <label for="font-family" class="block mb-2 text-sm font-medium text-gray-300">字体</label>
                <select id="font-family" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                    <option value="Helvetica">Helvetica</option>
                    <option value="TimesRoman">Times New Roman</option>
                    <option value="Courier">Courier</option>
                </select>
            </div>
            <div>
                <label for="font-size" class="block mb-2 text-sm font-medium text-gray-300">字号</label>
                <input type="number" id="font-size" value="12" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
            </div>
            <div>
                <label for="page-size" class="block mb-2 text-sm font-medium text-gray-300">页面尺寸</label>
                <select id="page-size" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                    <option value="A4">A4</option>
                    <option value="Letter">Letter</option>
                </select>
            </div>
            <div>
                <label for="text-color" class="block mb-2 text-sm font-medium text-gray-300">文本颜色</label>
                <input type="color" id="text-color" value="#000000" class="w-full h-[42px] bg-gray-700 border border-gray-600 rounded-lg p-1 cursor-pointer">
            </div>
        </div>
        <button id="process-btn" class="btn-gradient w-full mt-6">生成 PDF</button>
    `,
  'invert-colors': () => `
        <h2 class="text-2xl font-bold text-white mb-4">反转 PDF 颜色</h2>
        <p class="mb-6 text-gray-400">通过反相颜色为 PDF 制作“深色模式”，适用于文本或图像较简单的文档。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <button id="process-btn" class="hidden btn-gradient w-full mt-6">反色并下载</button>
    `,
  'view-metadata': () => `
        <h2 class="text-2xl font-bold text-white mb-4">查看 PDF 元数据</h2>
        <p class="mb-6 text-gray-400">上传 PDF 查看标题、作者、创建日期等内部属性。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <div id="metadata-results" class="hidden mt-6 p-4 bg-gray-900 border border-gray-700 rounded-lg"></div>
    `,
  'reverse-pages': () => `
        <h2 class="text-2xl font-bold text-white mb-4">页面顺序反转</h2>
        <p class="mb-6 text-gray-400">将所有页面顺序反转，让最后一页变成第一页。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <button id="process-btn" class="hidden btn-gradient w-full mt-6">反转并下载</button>
    `,
  'md-to-pdf': () => `
        <h2 class="text-2xl font-bold text-white mb-4">Markdown 转 PDF</h2>
        <p class="mb-6 text-gray-400">使用 Markdown 撰写，选择格式后即可生成高质量的多页 PDF。 <br><strong class="text-gray-300">注意：</strong>引用网络图片时（如 https://...）需要保持联网才能渲染。</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
                <label for="page-format" class="block mb-2 text-sm font-medium text-gray-300">页面规格</label>
                <select id="page-format" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                    <option value="a4">A4</option>
                    <option value="letter">Letter</option>
                </select>
            </div>
            <div>
                <label for="orientation" class="block mb-2 text-sm font-medium text-gray-300">方向</label>
                <select id="orientation" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                    <option value="portrait">纵向</option>
                    <option value="landscape">横向</option>
                </select>
            </div>
            <div>
                <label for="margin-size" class="block mb-2 text-sm font-medium text-gray-300">页边距</label>
                <select id="margin-size" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                    <option value="normal">标准</option>
                    <option value="narrow">窄</option>
                    <option value="wide">宽</option>
                </select>
            </div>
        </div>
        <div class="h-[50vh]">
            <label for="md-input" class="block mb-2 text-sm font-medium text-gray-300">Markdown 编辑器</label>
            <textarea id="md-input" class="w-full h-full bg-gray-900 border border-gray-600 text-gray-300 rounded-lg p-3 font-mono resize-none" placeholder="# 欢迎使用 Markdown…"></textarea>
        </div>
        <button id="process-btn" class="btn-gradient w-full mt-6">由 Markdown 生成 PDF</button>
    `,
  'svg-to-pdf': () => `
        <h2 class="text-2xl font-bold text-white mb-4">SVG 转 PDF</h2>
        <p class="mb-6 text-gray-400">将一张或多张 SVG 矢量图合成为一个 PDF。</p>
        ${createFileInputHTML({ multiple: true, accept: 'image/svg+xml', showControls: true })}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <button id="process-btn" class="btn-gradient w-full mt-6">转换为 PDF</button>
    `,
  'bmp-to-pdf': () => `
        <h2 class="text-2xl font-bold text-white mb-4">BMP 转 PDF</h2>
        <p class="mb-6 text-gray-400">将一张或多张 BMP 图片合成为一个 PDF。</p>
        ${createFileInputHTML({ multiple: true, accept: 'image/bmp', showControls: true })}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <button id="process-btn" class="btn-gradient w-full mt-6">转换为 PDF</button>
    `,
  'heic-to-pdf': () => `
        <h2 class="text-2xl font-bold text-white mb-4">HEIC 转 PDF</h2>
        <p class="mb-6 text-gray-400">将 iPhone 或相机拍摄的 HEIC 图像合成为一个 PDF。</p>
        ${createFileInputHTML({ multiple: true, accept: '.heic,.heif', showControls: true })}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <button id="process-btn" class="btn-gradient w-full mt-6">转换为 PDF</button>
    `,
  'tiff-to-pdf': () => `
        <h2 class="text-2xl font-bold text-white mb-4">TIFF 转 PDF</h2>
        <p class="mb-6 text-gray-400">将单页或多页 TIFF 图像合成为一个 PDF。</p>
        ${createFileInputHTML({ multiple: true, accept: 'image/tiff', showControls: true })}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <button id="process-btn" class="btn-gradient w-full mt-6">转换为 PDF</button>
    `,
  'pdf-to-bmp': () => `
        <h2 class="text-2xl font-bold text-white mb-4">PDF 转 BMP</h2>
        <p class="mb-6 text-gray-400">将 PDF 每一页导出为 BMP 图像，并打包为 ZIP 下载。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <button id="process-btn" class="btn-gradient w-full mt-6">转换为 BMP 并下载 ZIP</button>
    `,
  'pdf-to-tiff': () => `
        <h2 class="text-2xl font-bold text-white mb-4">PDF 转 TIFF</h2>
        <p class="mb-6 text-gray-400">将 PDF 每页导出为高质量 TIFF 图像，并打包为 ZIP 下载。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <button id="process-btn" class="btn-gradient w-full mt-6">转换为 TIFF 并下载 ZIP</button>
    `,

  'split-in-half': () => `
        <h2 class="text-2xl font-bold text-white mb-4">页面一分为二</h2>
        <p class="mb-6 text-gray-400">选择将每一页拆成两个页面的方式。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>

        <div id="split-half-options" class="hidden mt-6">
            <label for="split-type" class="block mb-2 text-sm font-medium text-gray-300">选择拆分方式</label>
            <select id="split-type" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5 mb-6">
                <option value="vertical">垂直拆分（左右两半）</option>
                <option value="horizontal">水平拆分（上下两半）</option>
            </select>

            <button id="process-btn" class="btn-gradient w-full mt-6">拆分 PDF</button>
        </div>
    `,
  'page-dimensions': () => `
        <h2 class="text-2xl font-bold text-white mb-4">分析页面尺寸</h2>
        <p class="mb-6 text-gray-400">上传 PDF 即可查看每页的精确尺寸、标准规格与方向。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>

        <div id="dimensions-results" class="hidden mt-6">
            <div class="flex justify-end mb-4">
                <label for="units-select" class="text-sm font-medium text-gray-300 self-center mr-3">显示单位：</label>
                <select id="units-select" class="bg-gray-700 border border-gray-600 text-white rounded-lg p-2">
                    <option value="pt" selected>点（pt）</option>
                    <option value="in">英寸（in）</option>
                    <option value="毫米">毫米（mm）</option>
                    <option value="px">像素（96 DPI）</option>
                </select>
            </div>
            <div class="overflow-x-auto rounded-lg border border-gray-700">
                <table class="min-w-full divide-y divide-gray-700 text-sm text-left">
                    <thead class="bg-gray-900">
                        <tr>
                            <th class="px-4 py-3 font-medium text-white">页码 #</th>
                            <th class="px-4 py-3 font-medium text-white">尺寸（宽 × 高）</th>
                            <th class="px-4 py-3 font-medium text-white">标准尺寸</th>
                            <th class="px-4 py-3 font-medium text-white">方向</th>
                        </tr>
                    </thead>
                    <tbody id="dimensions-table-body" class="divide-y divide-gray-700">
                        </tbody>
                </table>
            </div>
        </div>
    `,

  'n-up': () => `
        <h2 class="text-2xl font-bold text-white mb-4">拼版布局</h2>
        <p class="mb-6 text-gray-400">将多页内容排版到同一张纸上，适用于制作小册子或样张。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>

        <div id="n-up-options" class="hidden mt-6 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="pages-per-sheet" class="block mb-2 text-sm font-medium text-gray-300">每页拼版数量</label>
                    <select id="pages-per-sheet" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                        <option value="2">2 合 1</option>
                        <option value="4" selected>4 合 1（2×2）</option>
                        <option value="9">9 合 1（3×3）</option>
                        <option value="16">16 合 1（4×4）</option>
                    </select>
                </div>
                <div>
                    <label for="output-page-size" class="block mb-2 text-sm font-medium text-gray-300">输出纸张尺寸</label>
                    <select id="output-page-size" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                        <option value="Letter">Letter（8.5 × 11 英寸）</option>
                        <option value="Legal">Legal（8.5 × 14 英寸）</option>
                        <option value="Tabloid">Tabloid（11 × 17 英寸）</option>
                        <option value="A4" selected>A4（210 × 297 毫米）</option>
                        <option value="A3">A3（297 × 420 毫米）</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label for="output-orientation" class="block mb-2 text-sm font-medium text-gray-300">输出方向</label>
                    <select id="output-orientation" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                        <option value="auto" selected>自动</option>
                        <option value="portrait">纵向</option>
                        <option value="landscape">横向</option>
                    </select>
                </div>
                <div class="flex items-end pb-1">
                     <label class="flex items-center gap-2 text-sm font-medium text-gray-300">
                        <input type="checkbox" id="add-margins" checked class="w-4 h-4 rounded text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500">添加页边距与装订线
                    </label>
                </div>
            </div>

            <div class="border-t border-gray-700 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex items-center">
                     <label class="flex items-center gap-2 text-sm font-medium text-gray-300">
                        <input type="checkbox" id="add-border" class="w-4 h-4 rounded text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500">为每页添加边框线
                    </label>
                </div>
                 <div id="border-color-wrapper" class="hidden">
                    <label for="border-color" class="block mb-2 text-sm font-medium text-gray-300">边框颜色</label>
                     <input type="color" id="border-color" value="#000000" class="w-full h-[42px] bg-gray-700 border border-gray-600 rounded-lg p-1 cursor-pointer">
                </div>
            </div>

            <button id="process-btn" class="btn-gradient w-full mt-6">生成拼版 PDF</button>
        </div>
    `,

  'duplicate-organize': () => `
        <h2 class="text-2xl font-bold text-white mb-4">页面管理器</h2>
        <p class="mb-6 text-gray-400">拖动页面调整顺序。使用 <i data-lucide="copy-plus" class="inline-block w-4 h-4 text-green-400"></i>图标复制页面，或使用 <i data-lucide="x-circle" class="inline-block w-4 h-4 text-red-400"></i>图标即可删除。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>

        <div id="page-manager-options" class="hidden mt-6">
             <div id="page-grid" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 my-6">
                </div>
             <button id="process-btn" class="btn-gradient w-full mt-6">保存为新 PDF</button>
        </div>
    `,

  'combine-single-page': () => `
        <h2 class="text-2xl font-bold text-white mb-4">合并成单页长图</h2>
        <p class="mb-6 text-gray-400">将所有页面纵向拼接成一张连续长页，适合滚动阅读。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>

        <div id="combine-options" class="hidden mt-6 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="page-spacing" class="block mb-2 text-sm font-medium text-gray-300">页面间距（单位：点）</label>
                    <input type="number" id="page-spacing" value="18" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                </div>
                <div>
                    <label for="background-color" class="block mb-2 text-sm font-medium text-gray-300">背景颜色</label>
                    <input type="color" id="background-color" value="#FFFFFF" class="w-full h-[42px] bg-gray-700 border border-gray-600 rounded-lg p-1 cursor-pointer">
                </div>
            </div>
            <div>
                <label class="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <input type="checkbox" id="add-separator" class="w-4 h-4 rounded text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500">在页面之间绘制分隔线
                </label>
            </div>
            <button id="process-btn" class="btn-gradient w-full mt-6">组合页面</button>
        </div>
    `,

  'fix-dimensions': () => `
        <h2 class="text-2xl font-bold text-white mb-4">统一页面尺寸</h2>
        <p class="mb-6 text-gray-400">将文档中所有页面统一成同一尺寸，可选择标准规格或自定义尺寸。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>

        <div id="fix-dimensions-options" class="hidden mt-6 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="target-size" class="block mb-2 text-sm font-medium text-gray-300">目标尺寸</label>
                    <select id="target-size" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                        <option value="A4" selected>A4</option>
                        <option value="Letter">Letter</option>
                        <option value="Legal">Legal</option>
                        <option value="Tabloid">Tabloid</option>
                        <option value="A3">A3</option>
                        <option value="A5">A5</option>
                        <option value="Custom">自定义尺寸…</option>
                    </select>
                </div>
                <div>
                    <label for="orientation" class="block mb-2 text-sm font-medium text-gray-300">方向</label>
                    <select id="orientation" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                        <option value="portrait" selected>纵向</option>
                        <option value="landscape">横向</option>
                    </select>
                </div>
            </div>

            <div id="custom-size-wrapper" class="hidden p-4 rounded-lg bg-gray-900 border border-gray-700 grid grid-cols-3 gap-3">
                <div>
                    <label for="custom-width" class="block mb-2 text-xs font-medium text-gray-300">宽度</label>
                    <input type="number" id="custom-width" value="8.5" class="w-full bg-gray-700 border-gray-600 text-white rounded-lg p-2">
                </div>
                <div>
                    <label for="custom-height" class="block mb-2 text-xs font-medium text-gray-300">高度</label>
                    <input type="number" id="custom-height" value="11" class="w-full bg-gray-700 border-gray-600 text-white rounded-lg p-2">
                </div>
                <div>
                    <label for="custom-units" class="block mb-2 text-xs font-medium text-gray-300">单位</label>
                    <select id="custom-units" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2">
                        <option value="in">英寸</option>
                        <option value="mm">毫米</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="block mb-2 text-sm font-medium text-gray-300">缩放方式</label>
                <div class="flex gap-4 p-2 rounded-lg bg-gray-900">
                    <label class="flex-1 flex items-center gap-2 p-3 rounded-md hover:bg-gray-700 cursor-pointer">
                        <input type="radio" name="scaling-mode" value="fit" checked class="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500">
                        <div>
                            <span class="font-semibold text-white">适配</span>
                            <p class="text-xs text-gray-400">保留全部内容，可能出现白边。</p>
                        </div>
                    </label>
                    <label class="flex-1 flex items-center gap-2 p-3 rounded-md hover:bg-gray-700 cursor-pointer">
                        <input type="radio" name="scaling-mode" value="fill" class="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500">
                         <div>
                            <span class="font-semibold text-white">填充</span>
                            <p class="text-xs text-gray-400">填满页面，可能会裁切内容。</p>
                        </div>
                    </label>
                </div>
            </div>

             <div>
                <label for="background-color" class="block mb-2 text-sm font-medium text-gray-300">背景颜色（适用于“适配”模式）</label>
                <input type="color" id="background-color" value="#FFFFFF" class="w-full h-[42px] bg-gray-700 border border-gray-600 rounded-lg p-1 cursor-pointer">
            </div>

            <button id="process-btn" class="btn-gradient w-full mt-6">标准化页面</button>
        </div>
    `,

  'change-background-color': () => `
        <h2 class="text-2xl font-bold text-white mb-4">更改背景颜色</h2>
        <p class="mb-6 text-gray-400">为 PDF 的每一页选择新的背景颜色。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <div id="change-background-color-options" class="hidden mt-6">
            <label for="background-color" class="block mb-2 text-sm font-medium text-gray-300">选择背景颜色</label>
            <input type="color" id="background-color" value="#FFFFFF" class="w-full h-[42px] bg-gray-700 border border-gray-600 rounded-lg p-1 cursor-pointer">
            <button id="process-btn" class="btn-gradient w-full mt-6">应用颜色并下载</button>
        </div>
    `,

  'change-text-color': () => `
        <h2 class="text-2xl font-bold text-white mb-4">更改文字颜色</h2>
        <p class="mb-6 text-gray-400">将文档中的深色文字换成新的颜色。转换时页面会变成图片，因此最终文件中的文字不可再选取。</p>
        ${createFileInputHTML()}
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <div id="text-color-options" class="hidden mt-6 space-y-4">
            <div>
                <label for="text-color-input" class="block mb-2 text-sm font-medium text-gray-300">选择文字颜色</label>
                <input type="color" id="text-color-input" value="#FF0000" class="w-full h-[42px] bg-gray-700 border border-gray-600 rounded-lg p-1 cursor-pointer">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="text-center">
                    <h3 class="font-semibold text-white mb-2">原始</h3>
                    <canvas id="original-canvas" class="w-full h-auto rounded-lg border-2 border-gray-600"></canvas>
                </div>
                <div class="text-center">
                    <h3 class="font-semibold text-white mb-2">预览</h3>
                    <canvas id="text-color-canvas" class="w-full h-auto rounded-lg border-2 border-gray-600"></canvas>
                </div>
            </div>
            <button id="process-btn" class="btn-gradient w-full mt-6">应用颜色并下载</button>
        </div>
    `,

  'compare-pdfs': () => `
        <h2 class="text-2xl font-bold text-white mb-4">对比 PDF</h2>
        <p class="mb-6 text-gray-400">上传两个文件，可选择叠加或并排方式进行视觉对比。</p>
        
        <div id="compare-upload-area" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div id="drop-zone-1" class="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer bg-gray-900 hover:bg-gray-700">
                <div id="file-display-1" class="flex flex-col items-center justify-center pt-5 pb-6">
                    <i data-lucide="file-scan" class="w-10 h-10 mb-3 text-gray-400"></i>
                    <p class="mb-2 text-sm text-gray-400"><span class="font-semibold">上传原始 PDF</span></p>
                </div>
                <input id="file-input-1" type="file" class="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" accept="application/pdf">
            </div>
            <div id="drop-zone-2" class="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer bg-gray-900 hover:bg-gray-700">
                <div id="file-display-2" class="flex flex-col items-center justify-center pt-5 pb-6">
                    <i data-lucide="file-diff" class="w-10 h-10 mb-3 text-gray-400"></i>
                    <p class="mb-2 text-sm text-gray-400"><span class="font-semibold">上传修改后 PDF</span></p>
                </div>
                <input id="file-input-2" type="file" class="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" accept="application/pdf">
            </div>
        </div>

        <div id="compare-viewer" class="hidden mt-6">
            <div class="flex flex-wrap items-center justify-center gap-4 mb-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
                <button id="prev-page-compare" class="btn p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50"><i data-lucide="chevron-left"></i></button>
                <span class="text-white font-medium">页 <span id="current-page-display-compare">1</span>的 <span id="total-pages-display-compare">1</span></span>
                <button id="next-page-compare" class="btn p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50"><i data-lucide="chevron-right"></i></button>
                <div class="border-l border-gray-600 h-6 mx-2"></div>
                <div class="bg-gray-700 p-1 rounded-md flex gap-1">
                    <button id="view-mode-overlay" class="btn bg-indigo-600 px-3 py-1 rounded text-sm font-semibold">叠加模式</button>
                    <button id="view-mode-side" class="btn px-3 py-1 rounded text-sm font-semibold">并排对比</button>
                </div>
                <div class="border-l border-gray-600 h-6 mx-2"></div>
                <div id="overlay-controls" class="flex items-center gap-2">
                    <button id="flicker-btn" class="btn bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-md text-sm font-semibold">闪烁对比</button>
                    <label for="opacity-slider" class="text-sm font-medium text-gray-300">不透明度：</label>
                    <input type="range" id="opacity-slider" min="0" max="1" step="0.05" value="0.5" class="w-24">
                </div>
                <div id="side-by-side-controls" class="hidden flex items-center gap-2">
                    <label class="flex items-center gap-2 text-sm font-medium text-gray-300 cursor-pointer">
                        <input type="checkbox" id="sync-scroll-toggle" checked class="w-4 h-4 rounded text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500">同步滚动
                    </label>
                </div>
            </div>
            <div id="compare-viewer-wrapper" class="compare-viewer-wrapper overlay-mode">
                <div id="panel-1" class="pdf-panel"><canvas id="canvas-compare-1"></canvas></div>
                <div id="panel-2" class="pdf-panel"><canvas id="canvas-compare-2"></canvas></div>
            </div>
        </div>
    `,

  'ocr-pdf': () => `
    <h2 class="text-2xl font-bold text-white mb-4">OCR PDF</h2>
    <p class="mb-6 text-gray-400">将扫描版 PDF 转换为可搜索文本，建议勾选文档所含语言以获得最佳效果。</p>
    ${createFileInputHTML()}
    <div id="file-display-area" class="mt-4 space-y-2"></div>
    
    <div id="ocr-options" class="hidden mt-6 space-y-4">
        <div>
            <label class="block mb-2 text-sm font-medium text-gray-300">文档包含的语言</label>
            <div class="relative">
                <input type="text" id="lang-search" class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg p-2.5 mb-2" placeholder="搜索语言…">
                <div id="lang-list" class="max-h-48 overflow-y-auto border border-gray-600 rounded-lg p-2 bg-gray-900">
                    ${Object.entries(tesseractLanguages)
                      .map(
                        ([code, name]) => `
                        <label class="flex items-center gap-2 p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                            <input type="checkbox" value="${code}" class="lang-checkbox w-4 h-4 rounded text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500">
                            ${name}
                        </label>
                    `
                      )
                      .join('')}
                </div>
            </div>
             <p class="text-xs text-gray-500 mt-1">已选择： <span id="selected-langs-display" class="font-semibold">无</span></p>
        </div>
        
        <!-- Advanced settings section -->
        <details class="bg-gray-900 border border-gray-700 rounded-lg p-3">
            <summary class="text-sm font-medium text-gray-300 cursor-pointer">高级设置</summary>
            <div class="mt-4 space-y-4">
                <!-- Resolution Setting -->
                <div>
                    <label for="ocr-resolution" class="block mb-1 text-xs font-medium text-gray-400">分辨率</label>
                    <select id="ocr-resolution" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 text-sm">
                        <option value="2.0">标准（192 DPI）</option>
                        <option value="3.0" selected>高分辨率（288 DPI）</option>
                        <option value="4.0">超清（384 DPI）</option>
                    </select>
                </div>
                <!-- Binarization Toggle -->
                <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input type="checkbox" id="ocr-binarize" class="w-4 h-4 rounded text-indigo-600 bg-gray-700 border-gray-600">图像二值化（提升对比度）
                </label>
                <!-- Character Whitelist -->
                <div>
                    <label for="ocr-whitelist" class="block mb-1 text-xs font-medium text-gray-400">字符白名单（可选）</label>
                    <input type="text" id="ocr-whitelist" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 text-sm" placeholder="例如：abcdefghijklmnopqrstuvwxyz0123456789$.,">
                </div>
            </div>
        </details>
        
        <button id="process-btn" class="btn-gradient w-full disabled:opacity-50" disabled>开始 OCR</button>
    </div>

    <div id="ocr-progress" class="hidden mt-6 p-4 bg-gray-900 border border-gray-700 rounded-lg">
        <p id="progress-status" class="text-white mb-2">初始化中...</p>
        <div class="w-full bg-gray-700 rounded-full h-4">
            <div id="progress-bar" class="bg-indigo-600 h-4 rounded-full transition-width duration-300" style="width: 0%"></div>
        </div>
        <pre id="progress-log" class="mt-4 text-xs text-gray-400 max-h-32 overflow-y-auto bg-black p-2 rounded-md"></pre>
    </div>

    <div id="ocr-results" class="hidden mt-6">
        <h3 class="text-xl font-bold text-white mb-2">OCR 完成</h3>
        <p class="mb-4 text-gray-400">可搜索的 PDF 已生成，也可以复制或下载下方识别出的文本。</p>
        <div class="relative">
            <textarea id="ocr-text-output" rows="10" class="w-full bg-gray-900 border border-gray-600 text-gray-300 rounded-lg p-2.5 font-sans" readonly></textarea>
            <button id="copy-text-btn" class="absolute top-2 right-2 btn bg-gray-700 hover:bg-gray-600 p-2 rounded-md" title="复制到剪贴板">
                <i data-lucide="clipboard-copy" class="w-4 h-4 text-gray-300"></i>
            </button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <button id="download-txt-btn" class="btn w-full bg-gray-700 text-white font-semibold py-3 rounded-lg hover:bg-gray-600">下载为 .txt</button>
            <button id="download-searchable-pdf" class="btn w-full bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700">下载可搜索 PDF</button>
        </div>
    </div>
`,

  'word-to-pdf': () => `
        <h2 class="text-2xl font-bold text-white mb-4">Word 转 PDF 工具</h2>
        <p class="mb-6 text-gray-400">上传 .docx 文件可生成可选中文本的高质量 PDF，复杂排版可能无法完全保留。</p>
        
        <div id="file-input-wrapper">
             <div class="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer bg-gray-900 hover:bg-gray-700">
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                    <i data-lucide="file-text" class="w-10 h-10 mb-3 text-gray-400"></i>
                    <p class="mb-2 text-sm text-gray-400"><span class="font-semibold">点击选择文件</span>或拖拽到此</p>
                    <p class="text-xs text-gray-500">仅支持单个 .docx 文件</p>
                </div>
                <input id="file-input" type="file" class="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
            </div>
        </div>
        
        <div id="file-display-area" class="mt-4 space-y-2"></div>
        <button id="process-btn" class="btn-gradient w-full mt-6" disabled>预览并转换</button>
    `,

  'sign-pdf': () => `
    <h2 class="text-2xl font-bold text-white mb-4">签署 PDF</h2>
    <p class="mb-6 text-gray-400">先创建签名并选中，然后点击文档放置，可拖动调整位置。</p>
    ${createFileInputHTML()}
    
    <div id="signature-editor" class="hidden mt-6">
        <div class="bg-gray-900 p-4 rounded-lg border border-gray-700 mb-4">
            <div class="flex border-b border-gray-700 mb-4">
                <button id="draw-tab-btn" class="flex-1 p-2 text-sm font-semibold border-b-2 border-indigo-500 text-white">绘制</button>
                <button id="type-tab-btn" class="flex-1 p-2 text-sm font-semibold border-b-2 border-transparent text-gray-400">字体样式</button>
                <button id="upload-tab-btn" class="flex-1 p-2 text-sm font-semibold border-b-2 border-transparent text-gray-400">上传</button>
            </div>
            
            <div id="draw-panel">
                <canvas id="signature-draw-canvas" class="bg-white rounded-md cursor-crosshair w-full" height="150"></canvas>
                
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 gap-4 sm:gap-2">
                    <div class="flex items-center gap-2">
                        <label for="signature-color" class="text-sm font-medium text-gray-300">颜色：</label>
                        <input type="color" id="signature-color" value="#22c55e" class="w-10 h-10 bg-gray-700 border border-gray-600 rounded-lg p-1 cursor-pointer">
                    </div>
                    <div class="flex items-center gap-2">
                        <button id="clear-draw-btn" class="btn hover:bg-gray-600 text-sm flex-grow sm:flex-grow-0">清除</button>
                        <button id="save-draw-btn" class="btn-gradient px-4 py-2 text-sm rounded-lg flex-grow sm:flex-grow-0">保存签名</button>
                    </div>
                </div>
            </div>

            <div id="type-panel" class="hidden">
                <input type="text" id="signature-text-input" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5 mb-4" placeholder="在此输入姓名">
                
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label for="font-family-select" class="block mb-1 text-xs font-medium text-gray-400">字体样式</label>
                        <select id="font-family-select" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 text-sm">
                            <option value="'Great Vibes', cursive">签名</option>
                            <option value="'Kalam', cursive">手写体</option>
                            <option value="'Dancing Script', cursive">手写字体</option>
                            <option value="'Lato', sans-serif">常规</option>
                            <option value="'Merriweather', serif">正式</option>
                        </select>
                    </div>
                     <div>
                        <label for="font-size-slider" class="block mb-1 text-xs font-medium text-gray-400">字号（<span id="font-size-value">48</span>像素）</label>
                        <input type="range" id="font-size-slider" min="24" max="72" value="32" class="w-full">
                    </div>
                    <div>
                        <label for="font-color-picker" class="block mb-1 text-xs font-medium text-gray-400">颜色</label>
                        <input type="color" id="font-color-picker" value="#22c55e" class="w-full h-[38px] bg-gray-700 border border-gray-600 rounded-lg p-1 cursor-pointer">
                    </div>
                </div>

                <div id="font-preview" class="p-4 h-[80px] bg-transparent rounded-md flex items-center justify-center text-4xl" style="font-family: 'Great Vibes', cursive; font-size: 32px; color: #22c55e;">你的名字</div>
                 
                <div class="flex justify-end mt-4">
                    <button id="save-type-btn" class="btn-gradient px-4 py-2 text-sm rounded-lg">保存签名</button>
                </div>
            </div>

            <div id="upload-panel" class="hidden">
                <input type="file" id="signature-upload-input" accept="image/png" class="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700">仅支持 PNG 文件
            </div>
            
            <hr class="border-gray-700 my-4">
            <h4 class="text-md font-semibold text-white mb-2">已保存的签名</h4>
            <div id="saved-signatures-container" class="flex flex-wrap gap-2 bg-gray-800 p-2 rounded-md min-h-[50px]">
                <p class="text-xs text-gray-500 text-center w-full">已保存的签名会显示在此，点击即可选用。</p>
            </div>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-4 mb-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
            <button id="prev-page-sign" class="btn p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50"><i data-lucide="chevron-left"></i></button>
            <span class="text-white font-medium">页 <span id="current-page-display-sign">1</span>的 <span id="total-pages-display-sign">1</span></span>
            <button id="next-page-sign" class="btn p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50"><i data-lucide="chevron-right"></i></button>
            <div class="border-l border-gray-600 h-6 mx-2 hidden sm:block"></div>
            <button id="zoom-out-btn" class="btn p-2 rounded-full bg-gray-700 hover:bg-gray-600"><i data-lucide="zoom-out"></i></button>
            <button id="fit-width-btn" class="btn p-2 rounded-full bg-gray-700 hover:bg-gray-600"><i data-lucide="minimize"></i></button>
            <button id="zoom-in-btn" class="btn p-2 rounded-full bg-gray-700 hover:bg-gray-600"><i data-lucide="zoom-in"></i></button>
            <div class="border-l border-gray-600 h-6 mx-2 hidden sm:block"></div>
            <button id="undo-btn" class="btn p-2 rounded-full" title="撤销上一步操作"><i data-lucide="undo-2"></i></button>
        </div>

        <div id="canvas-container-sign" class="relative w-full overflow-auto bg-gray-900 rounded-lg border border-gray-600 h-[60vh] md:h-[80vh]">
            <canvas id="canvas-sign" class="mx-auto"></canvas>
        </div>

    </div>
    <button id="process-btn" class="hidden btn-gradient w-full mt-6">应用签名并下载 PDF</button>
`,

  'remove-annotations': () => `
    <h2 class="text-2xl font-bold text-white mb-4">移除批注</h2>
    <p class="mb-6 text-gray-400">选择要从全部或指定页面移除的批注类型。</p>
    ${createFileInputHTML()}
    <div id="file-display-area" class="mt-4 space-y-2"></div>

    <div id="remove-annotations-options" class="hidden mt-6 space-y-6">
        <div>
            <h3 class="text-lg font-semibold text-white mb-2">1. 选择页码范围</h3>
            <div class="flex gap-4 p-2 rounded-lg bg-gray-900">
                <label class="flex-1 flex items-center gap-2 p-3 rounded-md hover:bg-gray-700 cursor-pointer">
                    <input type="radio" name="page-scope" value="all" checked class="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500">
                    <span class="font-semibold text-white">全部页面</span>
                </label>
                <label class="flex-1 flex items-center gap-2 p-3 rounded-md hover:bg-gray-700 cursor-pointer">
                    <input type="radio" name="page-scope" value="specific" class="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500">
                    <span class="font-semibold text-white">指定页面</span>
                </label>
            </div>
            <div id="page-range-wrapper" class="hidden mt-2">
                 <input type="text" id="page-range-input" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5" placeholder="例如：1-3, 5, 8">
                 <p class="text-xs text-gray-400 mt-1">总页数： <span id="total-pages"></span></p>
            </div>
        </div>

        <div>
            <h3 class="text-lg font-semibold text-white mb-2">2. 选择要移除的批注类型</h3>
            <div class="space-y-3 p-4 bg-gray-900 rounded-lg border border-gray-700">
                <div class="border-b border-gray-700 pb-2">
                    <label class="flex items-center gap-2 font-semibold text-white cursor-pointer">
                        <input type="checkbox" id="select-all-annotations" class="w-4 h-4 rounded text-indigo-600 bg-gray-700 border-gray-600">全选 / 全不选
                    </label>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 pt-2">
                    <label class="flex items-center gap-2"><input type="checkbox" class="annot-checkbox" value="高亮">高亮</label>
                    <label class="flex items-center gap-2"><input type="checkbox" class="annot-checkbox" value="StrikeOut">删除线</label>
                    <label class="flex items-center gap-2"><input type="checkbox" class="annot-checkbox" value="下划线">下划线</label>
                    <label class="flex items-center gap-2"><input type="checkbox" class="annot-checkbox" value="Ink">手写/绘制</label>
                    <label class="flex items-center gap-2"><input type="checkbox" class="annot-checkbox" value="多边形">多边形</label>
                    <label class="flex items-center gap-2"><input type="checkbox" class="annot-checkbox" value="方形">方形</label>
                    <label class="flex items-center gap-2"><input type="checkbox" class="annot-checkbox" value="圆形">圆形</label>
                    <label class="flex items-center gap-2"><input type="checkbox" class="annot-checkbox" value="Line">直线 / 箭头</label>
                    <label class="flex items-center gap-2"><input type="checkbox" class="annot-checkbox" value="PolyLine">折线</label>
                    <label class="flex items-center gap-2"><input type="checkbox" class="annot-checkbox" value="链接">链接</label>
                    <label class="flex items-center gap-2"><input type="checkbox" class="annot-checkbox" value="文本">文本批注</label>
                    <label class="flex items-center gap-2"><input type="checkbox" class="annot-checkbox" value="FreeText">自由文本</label>
                    <label class="flex items-center gap-2"><input type="checkbox" class="annot-checkbox" value="Popup">弹出注释</label>
                    <label class="flex items-center gap-2"><input type="checkbox" class="annot-checkbox" value="波浪线">波浪线</label>
                    <label class="flex items-center gap-2"><input type="checkbox" class="annot-checkbox" value="印章">印章</label>
                    <label class="flex items-center gap-2"><input type="checkbox" class="annot-checkbox" value="插入符">插入符</label>
                    <label class="flex items-center gap-2"><input type="checkbox" class="annot-checkbox" value="FileAttachment">文件附件</label>    
                </div>
            </div>
        </div>
    </div>
    <button id="process-btn" class="hidden btn-gradient w-full mt-6">移除所选批注</button>
`,

  cropper: () => `
    <h2 class="text-2xl font-bold text-white mb-4">PDF 裁剪器</h2>
    <p class="mb-6 text-gray-400">上传 PDF 以可视化裁剪页面，提供实时预览与两种裁剪模式。</p>
    
    ${createFileInputHTML()}
    <div id="file-display-area" class="mt-4 space-y-2"></div>
    
    <div id="cropper-ui-container" class="hidden mt-6">
        
        <div class="p-3 bg-gray-900 rounded-lg border border-gray-700 mb-6">
            <p class="text-sm text-gray-300"><strong class="text-white">使用说明：</strong></p>
            <ul class="list-disc list-inside text-xs text-gray-400 mt-1 space-y-1">
                <li><strong class="text-white">实时预览：</strong>实时预览裁剪效果后再应用。</li>
                <li><strong class="text-white">非破坏模式：</strong>这是默认模式，通过调整页面边界“隐藏”被裁内容，原始文本与数据仍保留在文件中。</li>
                <li><strong class="text-white">破坏性模式：</strong>此选项会扁平化 PDF 并永久删除裁剪区域，安全性和压缩效果更佳，但文字将无法再选中。</li>
            </ul>
        </div>
        
        <div class="flex flex-col sm:flex-row items-center justify-between flex-wrap gap-4 mb-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
            <div class="flex items-center gap-2">
                 <button id="prev-page" class="btn p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50"><i data-lucide="chevron-left" class="w-5 h-5"></i></button>
                <span id="page-info" class="text-white font-medium">第 0 页，共 0 页</span>
                <button id="next-page" class="btn p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50"><i data-lucide="chevron-right" class="w-5 h-5"></i></button>
            </div>
            
            <div class="flex flex-col sm:flex-row items-center gap-4 flex-wrap">
                 <label class="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <input type="checkbox" id="destructive-crop-toggle" class="w-4 h-4 rounded text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500">启用破坏性裁剪
                </label>
                 <label class="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <input type="checkbox" id="apply-to-all-toggle" class="w-4 h-4 rounded text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500">应用到全部页面
                </label>
            </div>
        </div>
        
        <div id="status" class="text-center italic text-gray-400 mb-4">请先选择一个 PDF 文件。</div>
        <div id="cropper-container" class="w-full relative overflow-hidden flex items-center justify-center bg-gray-900 rounded-lg border border-gray-600 min-h-[500px]"></div>
        
        <button id="crop-button" class="btn-gradient w-full mt-6" disabled>裁剪并下载</button>
    </div>
`,

  'form-filler': () => `
    <h2 class="text-2xl font-bold text-white mb-4">PDF 表单填写</h2>
    <p class="mb-6 text-gray-400">上传 PDF 后可填写现有表单，右侧预览会实时更新。</p>
    ${createFileInputHTML()}
    <div id="file-display-area" class="mt-4 space-y-2"></div>
    <div id="form-filler-options" class="hidden mt-6">
        <div class="flex flex-col lg:flex-row gap-4 h-[80vh]">
            
            <!-- Sidebar for form fields -->
            <div class="w-full lg:w-1/3 bg-gray-900 rounded-lg p-4 overflow-y-auto border border-gray-700 flex-shrink-0">
                <div id="form-fields-container" class="space-y-4">
                    <div class="p-4 text-center text-gray-400">
                        <p>上传文件后将在此显示表单字段。</p>
                    </div>
                </div>
            </div>

            <!-- PDF Viewer -->
            <div class="w-full lg:w-2/3 flex flex-col items-center gap-4">
                <div class="flex flex-nowrap items-center justify-center gap-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
                    <button id="prev-page" class="btn p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50">
                        <i data-lucide="chevron-left" class="w-5 h-5"></i>
                    </button>
                    <span class="text-white font-medium">页 <span id="current-page-display">1</span>的 <span id="total-pages-display">1</span>
                    </span>
                    <button id="next-page" class="btn p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50">
                        <i data-lucide="chevron-right" class="w-5 h-5"></i>
                    </button>
                    <button id="zoom-out-btn" class="btn p-2 rounded-full bg-gray-700 hover:bg-gray-600">
                        <i data-lucide="zoom-out"></i>
                    </button>
                    <button id="zoom-in-btn" class="btn p-2 rounded-full bg-gray-700 hover:bg-gray-600">
                        <i data-lucide="zoom-in"></i>
                    </button>
                </div>

                <div id="pdf-viewer-container" class="relative w-full overflow-auto bg-gray-900 rounded-lg border border-gray-600 flex-grow">
                    <canvas id="pdf-canvas" class="mx-auto max-w-full h-full"></canvas>
                </div>
            </div>
        </div>
        
        <button id="process-btn" class="btn-gradient w-full mt-6 hidden">保存并下载</button>
    </div>
`,

  posterize: () => `
    <h2 class="text-2xl font-bold text-white mb-4">海报拆分 PDF</h2>
    <p class="mb-6 text-gray-400">将页面拆分成多张小纸用于打印海报，可在预览中查看网格随设置变化。</p>
    ${createFileInputHTML()}
    <div id="file-display-area" class="mt-4 space-y-2"></div>

    <div id="posterize-options" class="hidden mt-6 space-y-6">

        <div class="space-y-2">
             <label class="block text-sm font-medium text-gray-300">页面预览（<span id="current-preview-page">1</span> / <span id="total-preview-pages">1</span>)</label>
            <div id="posterize-preview-container" class="relative w-full max-w-xl mx-auto bg-gray-900 rounded-lg border-2 border-gray-600 flex items-center justify-center">
                <button id="prev-preview-page" class="absolute left-2 top-1/2 transform -translate-y-1/2 text-white bg-gray-800 bg-opacity-50 rounded-full p-2 hover:bg-gray-700 disabled:opacity-50 z-10"><i data-lucide="chevron-left"></i></button>
                <canvas id="posterize-preview-canvas" class="w-full h-auto rounded-md"></canvas>
                <button id="next-preview-page" class="absolute right-2 top-1/2 transform -translate-y-1/2 text-white bg-gray-800 bg-opacity-50 rounded-full p-2 hover:bg-gray-700 disabled:opacity-50 z-10"><i data-lucide="chevron-right"></i></button>
            </div>
        </div>

        <div class="p-4 bg-gray-900 border border-gray-700 rounded-lg">
            <h3 class="text-lg font-semibold text-white mb-3">网格布局</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="posterize-rows" class="block mb-2 text-sm font-medium text-gray-300">行数</label>
                    <input type="number" id="posterize-rows" value="1" min="1" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                </div>
                <div>
                    <label for="posterize-cols" class="block mb-2 text-sm font-medium text-gray-300">列数</label>
                    <input type="number" id="posterize-cols" value="2" min="1" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                </div>
            </div>
        </div>

        <div class="p-4 bg-gray-900 border border-gray-700 rounded-lg">
            <h3 class="text-lg font-semibold text-white mb-3">输出页面设置</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="output-page-size" class="block mb-2 text-sm font-medium text-gray-300">页面尺寸</label>
                    <select id="output-page-size" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                        <option value="A4" selected>A4</option>
                        <option value="Letter">Letter</option>
                        <option value="Legal">Legal</option>
                        <option value="A3">A3</option>
                        <option value="A5">A5</option>
                    </select>
                </div>
                <div>
                    <label for="output-orientation" class="block mb-2 text-sm font-medium text-gray-300">方向</label>
                    <select id="output-orientation" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                        <option value="auto" selected>自动（推荐）</option>
                        <option value="portrait">纵向</option>
                        <option value="landscape">横向</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="p-4 bg-gray-900 border border-gray-700 rounded-lg">
            <h3 class="text-lg font-semibold text-white mb-3">高级选项</h3>
            <div class="space-y-4">
                <div>
                    <label class="block mb-2 text-sm font-medium text-gray-300">内容缩放</label>
                    <div class="flex gap-4 p-2 rounded-lg bg-gray-800">
                        <label class="flex-1 flex items-center gap-2 p-3 rounded-md hover:bg-gray-700 cursor-pointer has-[:checked]:bg-indigo-600">
                            <input type="radio" name="scaling-mode" value="fit" checked class="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500">
                            <div>
                                <span class="font-semibold text-white">适配</span>
                                <p class="text-xs text-gray-400">保留全部内容，可能产生留白。</p>
                            </div>
                        </label>
                        <label class="flex-1 flex items-center gap-2 p-3 rounded-md hover:bg-gray-700 cursor-pointer has-[:checked]:bg-indigo-600">
                            <input type="radio" name="scaling-mode" value="fill" class="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500">
                             <div>
                                <span class="font-semibold text-white">填充（裁剪）</span>
                                <p class="text-xs text-gray-400">铺满页面，可能裁切内容。</p>
                            </div>
                        </label>
                    </div>
                </div>
                 <div>
                    <label for="overlap" class="block mb-2 text-sm font-medium text-gray-300">页面重叠量（用于拼贴）</label>
                    <div class="flex items-center gap-2">
                        <input type="number" id="overlap" value="0" min="0" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                        <select id="overlap-units" class="bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5">
                            <option value="pt">点数</option>
                            <option value="in">英寸</option>
                            <option value="mm">毫米</option>
                        </select>
                    </div>
                </div>
                 <div>
                    <label for="page-range" class="block mb-2 text-sm font-medium text-gray-300">页码范围（可选）</label>
                    <input type="text" id="page-range" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5" placeholder="例如：1-3, 5">
                    <p class="text-xs text-gray-400 mt-1">总页数： <span id="total-pages">0</span></p>
                </div>
            </div>
        </div>

        <button id="process-btn" class="btn-gradient w-full mt-6" disabled>海报拆分 PDF</button>
    </div>
`,

  'remove-blank-pages': () => `
    <h2 class="text-2xl font-bold text-white mb-4">移除空白页</h2>
    <p class="mb-6 text-gray-400">自动检测并移除空白或近似空白页面，可通过灵敏度决定判定标准。</p>
    ${createFileInputHTML()}
    <div id="file-display-area" class="mt-4 space-y-2"></div>

    <div id="remove-blank-options" class="hidden mt-6 space-y-4">
        <div>
            <label for="sensitivity-slider" class="block mb-2 text-sm font-medium text-gray-300">灵敏度（<span id="sensitivity-value">99</span>%)
            </label>
            <input type="range" id="sensitivity-slider" min="80" max="100" value="99" class="w-full">
            <p class="text-xs text-gray-400 mt-1">提高灵敏度时，需要页面更加“空白”才会被判定移除。</p>
        </div>
        
        <div id="analysis-preview" class="hidden p-4 bg-gray-900 border border-gray-700 rounded-lg">
             <h3 class="text-lg font-semibold text-white mb-2">分析结果</h3>
             <p id="analysis-text" class="text-gray-300"></p>
             <div id="removed-pages-thumbnails" class="mt-4 grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2"></div>
        </div>

        <button id="process-btn" class="btn-gradient w-full mt-6">移除空白页并下载</button>
    </div>
`,

  'alternate-merge': () => `
    <h2 class="text-2xl font-bold text-white mb-4">交替合并页面</h2>
    <p class="mb-6 text-gray-400">从多个文档中交替提取页面，拖动文件即可设定混合顺序（例如文档 A 第 1 页、文档 B 第 1 页、文档 A 第 2 页等）。</p>
    ${createFileInputHTML({ multiple: true, accept: 'application/pdf', showControls: true })}
    
    <div id="alternate-merge-options" class="hidden mt-6">
        <div class="p-3 bg-gray-900 rounded-lg border border-gray-700 mb-3">
            <p class="text-sm text-gray-300"><strong class="text-white">使用说明：</strong></p>
            <ul class="list-disc list-inside text-xs text-gray-400 mt-1 space-y-1">
                <li>工具会按设定顺序从各文档依次取出页面，重复循环直到所有页面用尽。</li>
                <li>如果某个文档页数不足，会自动跳过并继续与其他文档交替。</li>
            </ul>
        </div>
        <ul id="alternate-file-list" class="space-y-2"></ul>
        <button id="process-btn" class="btn-gradient w-full mt-6" disabled>交错合并 PDF</button>
    </div>
`,
};
