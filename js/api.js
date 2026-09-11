/**
 * ==============================================================================
 * XYZ Hotel — Unified Client API Bridge
 * Communicates with the Express + Prisma + Supabase backend API.
 * Provides live synchronization between Admin Panel and Public Website.
 * ==============================================================================
 */

(function () {
  'use strict';

  const API_BASE = window.location.origin.includes('5055') || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? ''
    : 'http://localhost:5055';

  /**
   * Safe fetch wrapper with JSON parsing and authentication headers
   */
  async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = options.headers || {};

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const token = localStorage.getItem('xyz_admin_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const resp = await fetch(url, { ...options, headers });
      const contentType = resp.headers.get('content-type') || '';
      
      let data = null;
      if (contentType.includes('application/json')) {
        data = await resp.json();
      } else {
        const text = await resp.text();
        data = { message: text };
      }

      if (!resp.ok) {
        throw new Error(data.message || `Request failed with status ${resp.status}`);
      }
      return data;
    } catch (err) {
      console.warn(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err.message);
      throw err;
    }
  }

  window.XYZ_API = {
    // --------------------------------------------------------------------------
    // Rooms & Suites
    // --------------------------------------------------------------------------
    rooms: {
      async getAll(params = {}) {
        const query = new URLSearchParams(params).toString();
        const res = await request(`/api/rooms${query ? `?${query}` : ''}`);
        return res.data || [];
      },
      async get(slugOrId) {
        const res = await request(`/api/rooms/${slugOrId}`);
        return res.data;
      },
      async create(roomData) {
        return await request('/api/rooms', {
          method: 'POST',
          body: JSON.stringify(roomData),
        });
      },
      async update(id, roomData) {
        return await request(`/api/rooms/${id}`, {
          method: 'PUT',
          body: JSON.stringify(roomData),
        });
      },
      async delete(id) {
        return await request(`/api/rooms/${id}`, { method: 'DELETE' });
      },
      async checkAvailability(roomId, checkIn, checkOut, rooms = 1) {
        const q = new URLSearchParams({ roomId, checkIn, checkOut, rooms }).toString();
        return await request(`/api/rooms/availability/check?${q}`);
      },
    },

    // --------------------------------------------------------------------------
    // Bookings & Reservations
    // --------------------------------------------------------------------------
    bookings: {
      async create(bookingData) {
        return await request('/api/bookings', {
          method: 'POST',
          body: JSON.stringify(bookingData),
        });
      },
      async getAll(params = {}) {
        const query = new URLSearchParams(params).toString();
        const res = await request(`/api/bookings${query ? `?${query}` : ''}`);
        return res.data || [];
      },
      async get(refOrId) {
        const res = await request(`/api/bookings/${refOrId}`);
        return res.data;
      },
      async updateStatus(id, status, notes = '') {
        return await request(`/api/bookings/${id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status, notes }),
        });
      },
      async delete(id) {
        return await request(`/api/bookings/${id}`, { method: 'DELETE' });
      },
    },

    // --------------------------------------------------------------------------
    // Dining & Venues
    // --------------------------------------------------------------------------
    dining: {
      async getAll(all = false) {
        const res = await request(`/api/dining${all ? '?all=true' : ''}`);
        return res.data || [];
      },
      async get(slug) {
        const res = await request(`/api/dining/${slug}`);
        return res.data;
      },
      async create(venueData) {
        return await request('/api/dining', {
          method: 'POST',
          body: JSON.stringify(venueData),
        });
      },
      async update(id, venueData) {
        return await request(`/api/dining/${id}`, {
          method: 'PUT',
          body: JSON.stringify(venueData),
        });
      },
      async delete(id) {
        return await request(`/api/dining/${id}`, { method: 'DELETE' });
      },
      async reserve(reservationData) {
        return await request('/api/dining/reserve', {
          method: 'POST',
          body: JSON.stringify(reservationData),
        });
      },
      async getReservations() {
        const res = await request('/api/dining/reservations/all');
        return res.data || [];
      },
    },

    // --------------------------------------------------------------------------
    // Amenities & Spa Wellness
    // --------------------------------------------------------------------------
    amenities: {
      async getAll(params = {}) {
        const query = new URLSearchParams(params).toString();
        const res = await request(`/api/amenities${query ? `?${query}` : ''}`);
        return res.data || [];
      },
      async get(slug) {
        const res = await request(`/api/amenities/${slug}`);
        return res.data;
      },
      async create(amenityData) {
        return await request('/api/amenities', {
          method: 'POST',
          body: JSON.stringify(amenityData),
        });
      },
      async update(id, amenityData) {
        return await request(`/api/amenities/${id}`, {
          method: 'PUT',
          body: JSON.stringify(amenityData),
        });
      },
      async delete(id) {
        return await request(`/api/amenities/${id}`, { method: 'DELETE' });
      },
      async reserveSpa(spaData) {
        return await request('/api/amenities/spa/reserve', {
          method: 'POST',
          body: JSON.stringify(spaData),
        });
      },
      async getSpaReservations() {
        const res = await request('/api/amenities/spa/reservations');
        return res.data || [];
      },
    },

    // --------------------------------------------------------------------------
    // Offers & Promotions
    // --------------------------------------------------------------------------
    offers: {
      async getAll(all = false) {
        const res = await request(`/api/offers${all ? '?all=true' : ''}`);
        return res.data || [];
      },
      async validate(code) {
        return await request(`/api/offers/validate?code=${encodeURIComponent(code)}`);
      },
      async create(offerData) {
        return await request('/api/offers', {
          method: 'POST',
          body: JSON.stringify(offerData),
        });
      },
      async update(id, offerData) {
        return await request(`/api/offers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(offerData),
        });
      },
      async delete(id) {
        return await request(`/api/offers/${id}`, { method: 'DELETE' });
      },
    },

    // --------------------------------------------------------------------------
    // Reviews & Ratings
    // --------------------------------------------------------------------------
    reviews: {
      async getAll(params = {}) {
        const query = new URLSearchParams(params).toString();
        const res = await request(`/api/reviews${query ? `?${query}` : ''}`);
        return res.data || [];
      },
      async submit(reviewData) {
        return await request('/api/reviews', {
          method: 'POST',
          body: JSON.stringify(reviewData),
        });
      },
      async moderate(id, updateData) {
        return await request(`/api/reviews/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updateData),
        });
      },
      async delete(id) {
        return await request(`/api/reviews/${id}`, { method: 'DELETE' });
      },
    },

    // --------------------------------------------------------------------------
    // CMS Pages, Sections & Settings
    // --------------------------------------------------------------------------
    cms: {
      async getPages(all = false) {
        const res = await request(`/api/cms/pages${all ? '?all=true' : ''}`);
        return res.data || [];
      },
      async getPage(slug) {
        const res = await request(`/api/cms/pages/${slug}`);
        return res.data;
      },
      async updatePage(slug, data) {
        return await request(`/api/cms/pages/${slug}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      },
      async getSections() {
        const res = await request('/api/cms/sections');
        return res.data || [];
      },
      async getSection(key) {
        const res = await request(`/api/cms/sections/${key}`);
        return res.data;
      },
      async updateSection(key, data) {
        return await request(`/api/cms/sections/${key}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      },
      async getSettings() {
        const res = await request('/api/cms/settings');
        return res.data || {};
      },
      async updateSettings(settingsData) {
        return await request('/api/cms/settings', {
          method: 'PUT',
          body: JSON.stringify(settingsData),
        });
      },
    },

    // --------------------------------------------------------------------------
    // Contact & Concierge Inquiries
    // --------------------------------------------------------------------------
    contact: {
      async submit(formData) {
        return await request('/api/contact', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      },
      async getAll(status = '') {
        const q = status ? `?status=${encodeURIComponent(status)}` : '';
        const res = await request(`/api/contact${q}`);
        return res.data || [];
      },
      async updateStatus(id, status, notes = '') {
        return await request(`/api/contact/${id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status, notes }),
        });
      },
      async delete(id) {
        return await request(`/api/contact/${id}`, { method: 'DELETE' });
      },
    },

    // --------------------------------------------------------------------------
    // Newsletter
    // --------------------------------------------------------------------------
    newsletter: {
      async subscribe(email) {
        return await request('/api/newsletter/subscribe', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
      },
      async getSubscribers() {
        const res = await request('/api/newsletter/subscribers');
        return res.data || [];
      },
    },

    // --------------------------------------------------------------------------
    // Supabase Storage Asset Upload
    // --------------------------------------------------------------------------
    storage: {
      async upload(file, category = 'rooms') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);

        const res = await request('/api/storage/upload', {
          method: 'POST',
          body: formData,
        });
        return res.data;
      },
      async getAssets(category = '') {
        const q = category ? `?category=${encodeURIComponent(category)}` : '';
        const res = await request(`/api/storage/assets${q}`);
        return res.data || [];
      },
    },

    // --------------------------------------------------------------------------
    // Hotel Video & Cinematic Gallery Operations
    // --------------------------------------------------------------------------
    gallery: {
      async getAll(all = false, category = '', featured = false) {
        const params = new URLSearchParams();
        if (all) params.append('all', 'true');
        if (category && category !== 'All') params.append('category', category);
        if (featured) params.append('featured', 'true');
        const qs = params.toString() ? `?${params.toString()}` : '';
        const res = await request(`/api/gallery${qs}`);
        return res.data || [];
      },
      async get(id) {
        const res = await request(`/api/gallery/${id}`);
        return res.data;
      },
      async create(payload) {
        const res = await request('/api/gallery', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return res.data;
      },
      async update(id, payload) {
        const res = await request(`/api/gallery/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        return res.data;
      },
      async delete(id) {
        return await request(`/api/gallery/${id}`, {
          method: 'DELETE',
        });
      },
    },

    // --------------------------------------------------------------------------
    // Admin & Staff Operations
    // --------------------------------------------------------------------------
    admin: {
      async login(email, password) {
        const res = await request('/api/admin/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (res.token) {
          localStorage.setItem('xyz_admin_token', res.token);
          localStorage.setItem('xyz_admin_user', JSON.stringify(res.user));
        }
        return res;
      },
      logout() {
        localStorage.removeItem('xyz_admin_token');
        localStorage.removeItem('xyz_admin_user');
      },
      getUser() {
        try {
          return JSON.parse(localStorage.getItem('xyz_admin_user') || 'null');
        } catch (e) {
          return null;
        }
      },
      async getAnalytics() {
        const res = await request('/api/admin/analytics');
        return res.data || {};
      },
      async getNotifications() {
        const res = await request('/api/admin/notifications');
        return res.data || [];
      },
      async markNotificationsRead(id = null) {
        return await request('/api/admin/notifications/mark-read', {
          method: 'PUT',
          body: JSON.stringify({ id }),
        });
      },
    },

    // --------------------------------------------------------------------------
    // Universal Authentication (Guests & Staff)
    // --------------------------------------------------------------------------
    auth: {
      async login(email, password) {
        const res = await request('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (res.token) {
          localStorage.setItem('xyz_auth_token', res.token);
          localStorage.setItem('xyz_auth_user', JSON.stringify(res.user));
          if (res.user.role === 'ADMIN' || res.user.role === 'STAFF') {
            localStorage.setItem('xyz_admin_token', res.token);
            localStorage.setItem('xyz_admin_user', JSON.stringify(res.user));
          }
        }
        return res;
      },
      async register(name, email, password, phone = '') {
        const res = await request('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password, phone }),
        });
        if (res.token) {
          localStorage.setItem('xyz_auth_token', res.token);
          localStorage.setItem('xyz_auth_user', JSON.stringify(res.user));
        }
        return res;
      },
      logout() {
        localStorage.removeItem('xyz_auth_token');
        localStorage.removeItem('xyz_auth_user');
        localStorage.removeItem('xyz_admin_token');
        localStorage.removeItem('xyz_admin_user');
      },
      getUser() {
        try {
          return JSON.parse(localStorage.getItem('xyz_auth_user') || localStorage.getItem('xyz_admin_user') || 'null');
        } catch (e) {
          return null;
        }
      },
      getToken() {
        return localStorage.getItem('xyz_auth_token') || localStorage.getItem('xyz_admin_token');
      },
      async getProfile() {
        const res = await request('/api/auth/me');
        return res.user;
      },
    },
  };
})();
