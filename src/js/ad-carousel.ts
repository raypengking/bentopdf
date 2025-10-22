import { adItems } from './config/ads.js';

type NullableElement = HTMLElement | null;

const AUTOPLAY_INTERVAL = 5000;

export const initAdCarousel = () => {
  const track = document.getElementById('ad-carousel-track');
  if (!track || track.dataset.initialized === 'true') {
    return;
  }

  track.dataset.initialized = 'true';
  track.innerHTML = '';

  const dotsContainer = document.getElementById('ad-carousel-dots');
  dotsContainer?.replaceChildren();

  const dotElements: HTMLButtonElement[] = [];
  let slides: HTMLElement[] = [];
  let currentIndex = 0;
  let autoplayTimer: number | null = null;

  function updateSlide() {
    if (slides.length === 0) return;
    track.setAttribute(
      'style',
      `transform: translateX(-${currentIndex * 100}%);`
    );

    dotElements.forEach((dot, index) => {
      dot.classList.toggle('active', index === currentIndex);
    });
  }

  function goToSlide(index: number) {
    if (slides.length === 0) return;
    currentIndex = (index + slides.length) % slides.length;
    updateSlide();
  }

  function stopAutoplay() {
    if (autoplayTimer !== null) {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = window.setInterval(() => {
      goToSlide(currentIndex + 1);
    }, AUTOPLAY_INTERVAL);
  }

  function restartAutoplay() {
    startAutoplay();
  }

  adItems.forEach((ad, index) => {
    const slide = document.createElement('li');
    slide.className =
      'ad-carousel-slide flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full';

    const adLink = document.createElement('a');
    adLink.href = ad.href;
    adLink.target = '_blank';
    adLink.rel = 'noopener noreferrer';
    adLink.className =
      'ad-card block w-full bg-gray-800 border border-indigo-500/40 rounded-xl px-4 py-3 sm:px-6 sm:py-4 shadow-lg shadow-indigo-900/20 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-indigo-700/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900';

    const title = document.createElement('p');
    title.className = 'text-base sm:text-lg font-semibold text-white';
    title.textContent = ad.title;

    const description = document.createElement('p');
    description.className = 'text-sm sm:text-base text-gray-300 mt-1';
    description.textContent = ad.description;

    adLink.append(title, description);
    slide.appendChild(adLink);
    track.appendChild(slide);

    if (dotsContainer) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'ad-carousel-dot';
      dot.setAttribute('aria-label', `查看第 ${index + 1} 条广告`);
      dot.addEventListener('click', () => {
        goToSlide(index);
        restartAutoplay();
      });
      dotsContainer.appendChild(dot);
      dotElements.push(dot);
    }
  });

  slides = Array.from(track.querySelectorAll<HTMLElement>('.ad-carousel-slide'));
  if (slides.length === 0) {
    return;
  }

  const prevBtn = document.getElementById('ad-carousel-prev');
  const nextBtn = document.getElementById('ad-carousel-next');
  const viewport = document.getElementById('ad-carousel-viewport');

  prevBtn?.addEventListener('click', () => {
    goToSlide(currentIndex - 1);
    restartAutoplay();
  });

  nextBtn?.addEventListener('click', () => {
    goToSlide(currentIndex + 1);
    restartAutoplay();
  });

  const interactiveElements: NullableElement[] = [viewport, prevBtn, nextBtn];
  interactiveElements
    .filter((element): element is HTMLElement => Boolean(element))
    .forEach((element) => {
      element.addEventListener('mouseenter', stopAutoplay);
      element.addEventListener('mouseleave', startAutoplay);
      element.addEventListener('focusin', stopAutoplay);
      element.addEventListener('focusout', startAutoplay);
    });

  startAutoplay();
  goToSlide(0);
};
