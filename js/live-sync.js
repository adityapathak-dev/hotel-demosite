/**
 * ==============================================================================
 * XYZ Hotel — Live Client Hydration & Database Synchronization
 * Reflects Admin Panel & Supabase PostgreSQL changes immediately on live pages:
 * - Room pricing, descriptions, images, availability
 * - Dynamic promotional offers on homepage and booking modal
 * - Dining venues & hours
 * - Verified guest reviews & ratings
 * ==============================================================================
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    syncLiveRooms();
    syncLiveOffers();
    syncLiveDining();
    syncLiveReviews();
    syncLiveSettings();
  });

  /**
   * 1. Synchronize Room cards & details on rooms.html and index.html
   */
  async function syncLiveRooms() {
    if (!window.XYZ_API?.rooms) return;

    try {
      const rooms = await XYZ_API.rooms.getAll();
      if (!Array.isArray(rooms) || rooms.length === 0) return;

      rooms.forEach((room) => {
        const slug = room.slug || room.id;
        // Check for sections on rooms.html (#deluxe, #suite, #presidential, #villa)
        const roomSection = document.getElementById(slug);
        if (roomSection) {
          const nameEl = roomSection.querySelector('.room-detail__name');
          if (nameEl && room.name) nameEl.textContent = room.name;

          const typeEl = roomSection.querySelector('.room-detail__type');
          if (typeEl && room.type) typeEl.textContent = room.type;

          const descEl = roomSection.querySelector('.room-detail__desc');
          if (descEl && room.description) descEl.textContent = room.description;

          const priceEl = roomSection.querySelector('.room-detail__price');
          if (priceEl && room.price) {
            priceEl.innerHTML = `₹${room.price.toLocaleString('en-IN')} <span>/ night</span>`;
          }

          const imgEl = roomSection.querySelector('.room-detail__image');
          if (imgEl && room.images && room.images[0]) {
            imgEl.src = room.images[0];
          }
        }

        // Check for cards on index.html (.room-card[data-room="..."])
        const indexCards = document.querySelectorAll(`.room-card, .featured-room`);
        indexCards.forEach((card) => {
          const href = card.querySelector('a')?.getAttribute('href') || '';
          if (href.includes(slug)) {
            const priceVal = card.querySelector('.room-card__price, .price');
            if (priceVal && room.price) {
              priceVal.innerHTML = `₹${room.price.toLocaleString('en-IN')} <span class="period">/ night</span>`;
            }
            const cardImg = card.querySelector('img');
            if (cardImg && room.images && room.images[0]) {
              cardImg.src = room.images[0];
            }
          }
        });
      });
    } catch (e) {
      // Quiet fail if server offline
    }
  }

  /**
   * 2. Synchronize Exclusive Offers on index.html
   */
  async function syncLiveOffers() {
    if (!window.XYZ_API?.offers) return;

    try {
      const offersGrid = document.querySelector('.offers__grid, #offersGrid, .promotions-grid');
      if (!offersGrid) return;

      const offers = await XYZ_API.offers.getAll();
      if (!Array.isArray(offers) || offers.length === 0) return;

      // If offers container exists, dynamically render latest verified offers
      offersGrid.innerHTML = offers
        .map(
          (o) => `
        <div class="offer-card reveal reveal--up" style="background: var(--color-surface, #121824); border: 1px solid rgba(197, 168, 128, 0.2); overflow: hidden; display: flex; flex-direction: column;">
          ${o.imageUrl ? `<div style="height: 200px; overflow: hidden;"><img src="${o.imageUrl}" alt="${o.title}" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}
          <div style="padding: 1.5rem; flex: 1; display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <span class="offer-badge" style="background: rgba(197,168,128,0.2); color: var(--color-gold, #c5a880); padding: 0.25rem 0.65rem; font-size: 0.75rem; text-transform: uppercase; font-weight: 600; letter-spacing: 0.08em;">${o.badgeText}</span>
              ${o.promoCode ? `<span style="font-size: 0.8rem; font-family: monospace; color: var(--color-gold, #c5a880);">CODE: <strong>${o.promoCode}</strong></span>` : ''}
            </div>
            <h3 style="font-family: 'Cinzel', serif; font-size: 1.25rem; margin-bottom: 0.5rem; color: #fff;">${o.title}</h3>
            <p style="font-size: 0.88rem; color: var(--color-text-muted, #94a3b8); margin-bottom: 1.25rem; flex: 1;">${o.description}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 1rem;">
              <span style="font-size: 0.8rem; color: var(--color-text-muted, #94a3b8);">${o.terms || 'Limited availability'}</span>
              <a href="booking.html?promo=${encodeURIComponent(o.promoCode || '')}" class="btn btn--outline btn--sm" style="color: var(--color-gold, #c5a880); border: 1px solid var(--color-gold, #c5a880); padding: 0.4rem 0.9rem; text-decoration: none; font-size: 0.8rem;">Book Offer</a>
            </div>
          </div>
        </div>
      `
        )
        .join('');
    } catch (e) {
      // Quiet fail
    }
  }

  /**
   * 3. Synchronize Dining Venues on dining.html
   */
  async function syncLiveDining() {
    if (!window.XYZ_API?.dining) return;

    try {
      const venues = await XYZ_API.dining.getAll();
      if (!Array.isArray(venues) || venues.length === 0) return;

      venues.forEach((v) => {
        const section = document.getElementById(v.slug);
        if (section) {
          const name = section.querySelector('h2, .venue-name');
          if (name) name.textContent = v.name;

          const cuisine = section.querySelector('.cuisine, .venue-cuisine');
          if (cuisine) cuisine.textContent = v.cuisine;

          const desc = section.querySelector('.venue-desc, p');
          if (desc && v.description) desc.textContent = v.description;

          const hours = section.querySelector('.venue-hours, .hours');
          if (hours && v.hours) hours.textContent = v.hours;
        }
      });
    } catch (e) {}
  }

  /**
   * 4. Synchronize Reviews on index.html
   */
  async function syncLiveReviews() {
    if (!window.XYZ_API?.reviews) return;

    try {
      const reviews = await XYZ_API.reviews.getAll({ featured: 'true' });
      if (!Array.isArray(reviews) || reviews.length === 0) return;

      const testimonialCards = document.querySelectorAll('.testimonial-card, .review-card');
      testimonialCards.forEach((card, idx) => {
        if (reviews[idx]) {
          const rev = reviews[idx];
          const author = card.querySelector('.author-name, .testimonial__author');
          if (author) author.textContent = rev.authorName;

          const text = card.querySelector('.comment, .testimonial__text');
          if (text) text.textContent = `"${rev.comment}"`;

          const loc = card.querySelector('.location, .testimonial__location');
          if (loc) loc.textContent = rev.location || '';
        }
      });
    } catch (e) {}
  }

  /**
   * 5. Synchronize Global Settings (Phone, Email, Address)
   */
  async function syncLiveSettings() {
    if (!window.XYZ_API?.cms) return;

    try {
      const settings = await XYZ_API.cms.getSettings();
      if (!settings) return;

      if (settings.phone) {
        document.querySelectorAll('.hotel-phone, a[href^="tel:"]').forEach((el) => {
          if (el.tagName === 'A') el.href = `tel:${settings.phone.replace(/[^0-9+]/g, '')}`;
          el.textContent = settings.phone;
        });
      }

      if (settings.email) {
        document.querySelectorAll('.hotel-email, a[href^="mailto:"]').forEach((el) => {
          if (el.tagName === 'A') el.href = `mailto:${settings.email}`;
          el.textContent = settings.email;
        });
      }
    } catch (e) {}
  }
})();
