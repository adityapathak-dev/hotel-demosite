/* ============================================
   XYZ HOTEL — Main JavaScript
   Global interactions, navigation, animations
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initScrollReveal();
  initMobileMenu();
  initBackToTop();
  initSmoothScroll();
});

/* ---------- Sticky Header ---------- */
function initHeader() {
  const header = document.querySelector('.header');
  if (!header) return;

  const updateHeader = () => {
    if (window.scrollY > 60) {
      header.classList.remove('header--transparent');
      header.classList.add('header--solid');
    } else {
      header.classList.add('header--transparent');
      header.classList.remove('header--solid');
    }
  };

  // Check if page is not the homepage (no hero)
  const hero = document.querySelector('.hero');
  if (!hero) {
    header.classList.remove('header--transparent');
    header.classList.add('header--solid');
    return;
  }

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
}

/* ---------- Scroll Reveal Animations ---------- */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal, .reveal-stagger');
  if (!reveals.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.05,
      rootMargin: '0px 0px -20px 0px',
    }
  );

  reveals.forEach((el) => observer.observe(el));
}

/* ---------- Mobile Menu ---------- */
function initMobileMenu() {
  const toggle = document.querySelector('.header__menu-toggle');
  const navLinks = document.querySelector('.header__nav-links');
  const overlay = document.querySelector('.mobile-overlay');
  if (!toggle || !navLinks) return;

  const closeMenu = () => {
    toggle.classList.remove('active');
    navLinks.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  toggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.contains('open');
    if (isOpen) {
      closeMenu();
    } else {
      toggle.classList.add('active');
      navLinks.classList.add('open');
      if (overlay) overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  });

  if (overlay) {
    overlay.addEventListener('click', closeMenu);
  }

  // Close on nav link click
  navLinks.querySelectorAll('.header__nav-link').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  // Close on resize
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeMenu();
    }
  });
}

/* ---------- Back to Top ---------- */
function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------- Smooth Scroll ---------- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const headerOffset = 90;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + (window.scrollY || window.pageYOffset) - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    });
  });
}

/* ---------- Utility: Set active nav link ---------- */
function setActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop().split('?')[0].split('#')[0] || 'index.html';
  document.querySelectorAll('.header__nav-link').forEach((link) => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (!href) return;
    const cleanHref = href.split('?')[0].split('#')[0];
    if (cleanHref === currentPath || (currentPath === '' && cleanHref === 'index.html')) {
      link.classList.add('active');
    }
  });
}

setActiveNavLink();
