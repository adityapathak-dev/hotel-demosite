/* ============================================
   XYZ HOTEL — Carousel Component
   Reusable slider with autoplay, dots, arrows
   ============================================ */

class Carousel {
  constructor(element, options = {}) {
    this.el = element;
    this.track = element.querySelector('.carousel__track');
    this.slides = [...element.querySelectorAll('.carousel__slide')];
    this.prevBtn = element.querySelector('.carousel__prev');
    this.nextBtn = element.querySelector('.carousel__next');
    this.dotsContainer = element.querySelector('.carousel__dots');

    this.options = {
      autoplay: true,
      interval: 5000,
      pauseOnHover: true,
      ...options,
    };

    this.currentIndex = 0;
    this.totalSlides = this.slides.length;
    this.autoplayTimer = null;
    this.isTransitioning = false;

    if (this.totalSlides > 0) {
      this.init();
    }
  }

  init() {
    this.createDots();
    this.bindEvents();
    this.goTo(0);

    if (this.options.autoplay) {
      this.startAutoplay();
    }
  }

  createDots() {
    if (!this.dotsContainer) return;

    this.dotsContainer.innerHTML = '';
    this.slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.classList.add('carousel__dot');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => this.goTo(i));
      this.dotsContainer.appendChild(dot);
    });

    this.dots = [...this.dotsContainer.querySelectorAll('.carousel__dot')];
  }

  bindEvents() {
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.prev());
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.next());
    }

    if (this.options.pauseOnHover) {
      this.el.addEventListener('mouseenter', () => this.stopAutoplay());
      this.el.addEventListener('mouseleave', () => {
        if (this.options.autoplay) this.startAutoplay();
      });
    }

    // Touch/swipe support
    if (this.track) {
      let startX = 0;
      let isDragging = false;

      this.track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
      }, { passive: true });

      this.track.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        const endX = e.changedTouches[0].clientX;
        const diff = startX - endX;

        if (Math.abs(diff) > 50) {
          if (diff > 0) this.next();
          else this.prev();
        }
        isDragging = false;
      }, { passive: true });
    }
  }

  goTo(index) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Handle wrapping
    if (index < 0) index = this.totalSlides - 1;
    if (index >= this.totalSlides) index = 0;

    this.currentIndex = index;

    // Move track
    if (this.track) {
      this.track.style.transform = `translateX(-${index * 100}%)`;
    }

    // Update dots
    if (this.dots) {
      this.dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
    }

    // Update slides
    this.slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });

    setTimeout(() => {
      this.isTransitioning = false;
    }, 600);
  }

  next() {
    this.goTo(this.currentIndex + 1);
  }

  prev() {
    this.goTo(this.currentIndex - 1);
  }

  startAutoplay() {
    this.stopAutoplay();
    this.autoplayTimer = setInterval(() => this.next(), this.options.interval);
  }

  stopAutoplay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }
}

/* ---------- Auto-init carousels ---------- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-carousel]').forEach((el) => {
    const options = {
      autoplay: el.dataset.autoplay !== 'false',
      interval: parseInt(el.dataset.interval) || 5000,
    };
    new Carousel(el, options);
  });
});
