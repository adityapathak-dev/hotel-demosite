/**
 * XYZ Hotel — Guest Video Gallery Component Controller
 * Loads cinematic video showcases from API with category filter and modal playback.
 */

(function () {
  'use strict';

  class VideoGalleryController {
    constructor() {
      this.gridEl = document.getElementById('guestGalleryGrid');
      this.filterContainer = document.getElementById('guestGalleryFilters');
      this.modalEl = document.getElementById('guestVideoModal');
      this.stageEl = document.getElementById('guestVideoStage');
      this.titleEl = document.getElementById('guestVideoTitle');
      this.descEl = document.getElementById('guestVideoDesc');
      this.closeBtn = document.getElementById('guestVideoClose');
      this.activeCategory = 'All';

      if (this.gridEl) {
        this.init();
      }
    }

    init() {
      this.bindEvents();
      this.loadVideos('All');
    }

    bindEvents() {
      if (this.filterContainer) {
        this.filterContainer.addEventListener('click', (e) => {
          const btn = e.target.closest('.gallery-filter-btn');
          if (!btn) return;
          this.filterContainer.querySelectorAll('.gallery-filter-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeCategory = btn.dataset.cat || 'All';
          this.loadVideos(this.activeCategory);
        });
      }

      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', () => this.closePlayer());
      }

      if (this.modalEl) {
        this.modalEl.addEventListener('click', (e) => {
          if (e.target === this.modalEl) this.closePlayer();
        });
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modalEl && this.modalEl.style.display === 'flex') {
          this.closePlayer();
        }
      });
    }

    async loadVideos(category = 'All') {
      if (!this.gridEl) return;
      this.gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: var(--color-text-muted); padding: 3rem;">
          <p>Loading cinematic showcase...</p>
        </div>
      `;

      try {
        const catQuery = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
        const resp = await fetch(`/api/gallery${catQuery}`);
        const result = await resp.json();
        const videos = result.data || [];

        if (videos.length === 0) {
          this.gridEl.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: var(--color-text-muted); padding: 3rem;">
              <p>No video showcases available in this category.</p>
            </div>
          `;
          return;
        }

        this.gridEl.innerHTML = videos
          .map(
            (v) => `
          <div class="gallery-video-card" data-video-url="${this.escapeAttr(v.videoUrl)}" data-title="${this.escapeAttr(v.title)}" data-desc="${this.escapeAttr(v.description || '')}">
            <div class="gallery-thumb-box">
              <img src="${v.thumbnailUrl || 'images/hero-bg.jpg'}" alt="${this.escapeAttr(v.title)}" loading="lazy" onerror="this.src='images/hero-bg.jpg'">
              <div class="gallery-thumb-shade">
                <div class="gallery-play-orb">
                  <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
              <span class="gallery-duration-pill">${this.escapeHtml(v.duration || '2:15')}</span>
            </div>
            <div class="gallery-card-content">
              <span class="gallery-card-cat">${this.escapeHtml(v.category || 'Showcase')}</span>
              <h3 class="gallery-card-title">${this.escapeHtml(v.title)}</h3>
              <p class="gallery-card-text">${this.escapeHtml(v.description || '')}</p>
              <div class="gallery-card-link">
                <span>Watch Film</span>
                <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
          </div>
        `
          )
          .join('');

        // Attach click listener to each card
        this.gridEl.querySelectorAll('.gallery-video-card').forEach((card) => {
          card.addEventListener('click', () => {
            const url = card.dataset.videoUrl;
            const title = card.dataset.title;
            const desc = card.dataset.desc;
            this.openPlayer(url, title, desc);
          });
        });
      } catch (err) {
        console.error('Failed to load gallery videos:', err);
        this.gridEl.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #ef4444; padding: 2rem;">Showcase temporarily unavailable.</div>`;
      }
    }

    openPlayer(url, title, desc) {
      if (!this.modalEl || !this.stageEl) return;

      if (this.titleEl) this.titleEl.textContent = title || 'Cinematic Showcase';
      if (this.descEl) this.descEl.textContent = desc || '';

      const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (ytMatch) {
        this.stageEl.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      } else {
        this.stageEl.innerHTML = `
          <video controls autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;">
            <source src="${url}" type="video/mp4">
            Your browser does not support HTML5 video.
          </video>
        `;
      }

      this.modalEl.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }

    closePlayer() {
      if (this.modalEl) this.modalEl.style.display = 'none';
      if (this.stageEl) this.stageEl.innerHTML = '';
      document.body.style.overflow = '';
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    escapeAttr(str) {
      if (!str) return '';
      return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.xyzVideoGallery = new VideoGalleryController();
  });
})();
