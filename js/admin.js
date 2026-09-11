/**
 * ==============================================================================
 * XYZ Hotel — Executive Admin & CMS Controller
 * Full CRUD, Supabase Storage uploads, and real-time dashboard analytics.
 * ==============================================================================
 */

(function () {
  'use strict';

  class AdminController {
    constructor() {
      this.currentTab = 'dashboard';
      this.activeCmsPage = 'about-legacy';
      this.init();
    }

    async init() {
      this.bindAuthEvents();
      this.bindTabNavigation();
      this.bindModalEvents();
      this.bindStorageEvents();
      this.bindGalleryEvents();
      this.bindCmsEvents();

      // Check existing session
      const user = XYZ_API.admin.getUser();
      const token = localStorage.getItem('xyz_admin_token');

      if (token && user) {
        this.unlockApp(user);
      } else {
        this.showLoginGate();
      }
    }

    // --------------------------------------------------------------------------
    // Authentication
    // --------------------------------------------------------------------------
    bindAuthEvents() {
      const form = document.getElementById('loginForm');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('adminEmail').value.trim();
          const password = document.getElementById('adminPassword').value.trim();
          const errDiv = document.getElementById('loginError');
          const btn = document.getElementById('loginBtn');

          errDiv.style.display = 'none';
          btn.disabled = true;
          btn.textContent = 'Authenticating...';

          try {
            const res = await XYZ_API.admin.login(email, password);
            if (res.success) {
              this.unlockApp(res.user);
            } else {
              errDiv.textContent = res.message || 'Authentication failed';
              errDiv.style.display = 'block';
            }
          } catch (err) {
            errDiv.textContent = err.message || 'Login error occurred';
            errDiv.style.display = 'block';
          } finally {
            btn.disabled = false;
            btn.textContent = 'Authenticate Session';
          }
        });
      }

      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          XYZ_API.admin.logout();
          window.location.reload();
        });
      }

      const refreshBtn = document.getElementById('refreshDataBtn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          this.loadActiveTabData();
        });
      }
    }

    showLoginGate() {
      document.getElementById('loginGate').style.display = 'flex';
      document.getElementById('adminApp').style.display = 'none';
    }

    unlockApp(user) {
      document.getElementById('loginGate').style.display = 'none';
      document.getElementById('adminApp').style.display = 'flex';

      if (user) {
        document.getElementById('userName').textContent = user.name || 'Staff';
        document.getElementById('userRole').textContent = user.role || 'ADMIN';
        document.getElementById('userInitial').textContent = (user.name || 'A').charAt(0).toUpperCase();
      }

      this.checkDatabaseHealth();
      this.switchTab('dashboard');
    }

    async checkDatabaseHealth() {
      try {
        const resp = await fetch('/api/health');
        if (resp.ok) {
          const data = await resp.json();
          const badge = document.getElementById('dbStatusText');
          if (data.database && data.database.connected) {
            badge.textContent = 'Supabase PostgreSQL';
          } else {
            badge.textContent = 'Live Resilient Mode';
          }
        }
      } catch (e) {
        // quiet
      }
    }

    // --------------------------------------------------------------------------
    // Navigation & Tabs
    // --------------------------------------------------------------------------
    bindTabNavigation() {
      const navButtons = document.querySelectorAll('.sidebar-nav .nav-item');
      navButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const tab = btn.dataset.tab;
          this.switchTab(tab);
        });
      });
    }

    switchTab(tabName) {
      this.currentTab = tabName;

      // Update sidebar state
      document.querySelectorAll('.sidebar-nav .nav-item').forEach((b) => {
        b.classList.toggle('active', b.dataset.tab === tabName);
      });

      // Show matching pane
      document.querySelectorAll('.tab-pane').forEach((p) => {
        p.classList.toggle('active', p.id === `tab-${tabName}`);
      });

      // Update titles
      const titles = {
        dashboard: { title: 'Executive Dashboard', sub: 'Live status across rooms, bookings, culinary & CMS' },
        rooms: { title: 'Rooms & Suites Inventory', sub: 'Instant live updates to guest room rates, capacity & amenities' },
        bookings: { title: 'Reservations & Folios', sub: 'Collision-free guest bookings & status dispatch' },
        dining: { title: 'Dining Venues & Reservations', sub: 'Haute cuisine restaurants, menus, and table bookings' },
        amenities: { title: 'Amenities & Wellness Spa', sub: 'Recreation facilities and bespoke spa ritual appointments' },
        offers: { title: 'Offers & Promo Codes', sub: 'Seasonal discounts, package deals, and promo codes' },
        reviews: { title: 'Guest Reviews & Ratings', sub: 'Verified guest feedback and homepage testimonial moderation' },
        cms: { title: 'CMS & Homepage Sections', sub: 'Customize hero banners, headlines, stats, and legal pages' },
        inquiries: { title: 'Concierge Inquiries', sub: 'Inbound guest communications & newsletter roster' },
        storage: { title: 'Supabase Storage Manager', sub: 'Direct bucket uploads to PostgreSQL media registry' },
        gallery: { title: 'Hotel Cinematic Video Gallery', sub: 'Manage walkthrough videos, drone property tours, dining & spa stories' },
        settings: { title: 'Global Property Settings', sub: 'Hotel metadata, telephone lines, and concierge contacts' },
      };

      if (titles[tabName]) {
        document.getElementById('pageTitle').textContent = titles[tabName].title;
        document.getElementById('pageSubtitle').textContent = titles[tabName].sub;
      }

      this.loadActiveTabData();
    }

    loadActiveTabData() {
      switch (this.currentTab) {
        case 'dashboard':
          this.loadDashboardData();
          break;
        case 'rooms':
          this.loadRoomsData();
          break;
        case 'bookings':
          this.loadBookingsData();
          break;
        case 'dining':
          this.loadDiningData();
          break;
        case 'amenities':
          this.loadAmenitiesData();
          break;
        case 'offers':
          this.loadOffersData();
          break;
        case 'reviews':
          this.loadReviewsData();
          break;
        case 'cms':
          this.loadCmsData();
          break;
        case 'inquiries':
          this.loadInquiriesData();
          break;
        case 'storage':
          this.loadStorageData();
          break;
        case 'gallery':
          this.loadGalleryData();
          break;
        case 'settings':
          this.loadSettingsData();
          break;
      }
    }

    // --------------------------------------------------------------------------
    // 1. Dashboard Tab
    // --------------------------------------------------------------------------
    async loadDashboardData() {
      try {
        const [analytics, notifs] = await Promise.all([
          XYZ_API.admin.getAnalytics(),
          XYZ_API.admin.getNotifications(),
        ]);

        document.getElementById('statRevenue').textContent = `₹${(analytics.totalRevenue || 0).toLocaleString('en-IN')}`;
        document.getElementById('statOccupancy').textContent = analytics.occupancyRate || '0%';
        document.getElementById('statBookings').textContent = analytics.totalBookings || 0;
        document.getElementById('statInquiries').textContent = analytics.unreadInquiries || 0;

        // Render recent bookings
        const tbody = document.getElementById('dashRecentBookingsBody');
        const recent = analytics.recentBookings || [];
        if (recent.length === 0) {
          tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No bookings recorded yet</td></tr>`;
        } else {
          tbody.innerHTML = recent
            .map((b) => {
              const guestName = b.guest ? `${b.guest.firstName} ${b.guest.lastName}` : b.guestName || 'Guest';
              const roomName = b.room ? b.room.name : b.roomName || 'Suite';
              const ref = b.bookingRef || 'XYZ';
              const total = (b.totalAmount || 0).toLocaleString('en-IN');
              const statusClass = (b.status || '').toLowerCase().replace(/_/g, '-');
              return `
                <tr>
                  <td><strong style="color: var(--gold-primary);">${ref}</strong></td>
                  <td>${this.escapeHtml(guestName)}</td>
                  <td>${this.escapeHtml(roomName)}</td>
                  <td>₹${total}</td>
                  <td><span class="badge badge-${statusClass}">${b.status}</span></td>
                </tr>
              `;
            })
            .join('');
        }

        // Render notifications
        const notifContainer = document.getElementById('notificationsList');
        if (notifs.length === 0) {
          notifContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No alerts at this time</div>`;
        } else {
          notifContainer.innerHTML = notifs
            .slice(0, 10)
            .map((n) => `
              <div class="notif-item ${n.isRead ? 'read' : ''}">
                <div class="notif-title">${this.escapeHtml(n.title)}</div>
                <div class="notif-message">${this.escapeHtml(n.message)}</div>
                <div class="notif-time">${new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${new Date(n.createdAt).toLocaleDateString()}</div>
              </div>
            `)
            .join('');
        }

        // Mark all read button
        const markReadBtn = document.getElementById('markAllNotifsReadBtn');
        if (markReadBtn) {
          markReadBtn.onclick = async () => {
            await XYZ_API.admin.markNotificationsRead();
            this.loadDashboardData();
          };
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      }
    }

    // --------------------------------------------------------------------------
    // 2. Rooms Tab
    // --------------------------------------------------------------------------
    async loadRoomsData() {
      const tbody = document.getElementById('roomsTableBody');
      tbody.innerHTML = `<tr><td colspan="7" class="loading-td">Fetching suites from database...</td></tr>`;

      try {
        const rooms = await XYZ_API.rooms.getAll({ all: true });
        if (rooms.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">No rooms configured.</td></tr>`;
          return;
        }

        tbody.innerHTML = rooms
          .map((r) => `
            <tr>
              <td>
                <div style="font-weight: 600; color: #fff;">${this.escapeHtml(r.name)}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${this.escapeHtml(r.type || '')}</div>
              </td>
              <td><strong style="color: var(--gold-primary);">₹${r.price.toLocaleString('en-IN')}</strong> / night</td>
              <td>${r.capacity} Guests</td>
              <td>${r.sizeSqft || r.sizeSqm * 10.76} sq.ft</td>
              <td>${r.totalUnits || 5} Units</td>
              <td>
                <span class="badge ${r.isAvailable ? 'badge-active' : 'badge-inactive'}">
                  ${r.isAvailable ? 'Available' : 'Blocked'}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="btn-action-edit" onclick="window.adminApp.openRoomModal('${r.id || r.slug}')">Edit</button>
                  <button class="btn-action-delete" onclick="window.adminApp.deleteRoom('${r.id || r.slug}')">Delete</button>
                </div>
              </td>
            </tr>
          `)
          .join('');

        document.getElementById('addNewRoomBtn').onclick = () => this.openRoomModal(null);
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="color: var(--status-danger);">Failed to load rooms: ${err.message}</td></tr>`;
      }
    }

    async openRoomModal(roomIdOrSlug) {
      let room = null;
      if (roomIdOrSlug) {
        try {
          room = await XYZ_API.rooms.get(roomIdOrSlug);
        } catch (e) {
          console.error(e);
        }
      }

      const isEdit = Boolean(room);
      document.getElementById('modalTitle').textContent = isEdit ? `Edit ${room.name}` : 'Add New Luxury Suite';

      const body = document.getElementById('modalBody');
      body.innerHTML = `
        <form id="roomModalForm" class="cms-grid-form">
          <div class="form-group span-2">
            <label for="mRoomName">Suite Name</label>
            <input type="text" id="mRoomName" required value="${this.escapeHtml(room?.name || '')}" placeholder="e.g. Royal Maharaja Suite">
          </div>
          <div class="form-group">
            <label for="mRoomType">Category / Collection</label>
            <input type="text" id="mRoomType" required value="${this.escapeHtml(room?.type || 'Signature Luxury')}" placeholder="e.g. Executive Collection">
          </div>
          <div class="form-group">
            <label for="mRoomPrice">Nightly Rate (INR)</label>
            <input type="number" id="mRoomPrice" required value="${room?.price || 15000}" min="1000" step="500">
          </div>
          <div class="form-group">
            <label for="mRoomCapacity">Max Guests</label>
            <input type="number" id="mRoomCapacity" required value="${room?.capacity || 2}" min="1" max="10">
          </div>
          <div class="form-group">
            <label for="mRoomSize">Size (Sq.Ft)</label>
            <input type="number" id="mRoomSize" value="${room?.sizeSqft || 550}">
          </div>
          <div class="form-group">
            <label for="mRoomBed">Bed Configuration</label>
            <input type="text" id="mRoomBed" value="${this.escapeHtml(room?.bedType || 'King Bed')}">
          </div>
          <div class="form-group">
            <label for="mRoomView">View Type</label>
            <input type="text" id="mRoomView" value="${this.escapeHtml(room?.viewType || 'Panoramic City View')}">
          </div>
          <div class="form-group span-2">
            <label for="mRoomDesc">Suite Description</label>
            <textarea id="mRoomDesc" rows="3" required>${this.escapeHtml(room?.description || '')}</textarea>
          </div>
          <div class="form-group span-2">
            <label for="mRoomAmenities">Amenities (Comma separated)</label>
            <input type="text" id="mRoomAmenities" value="${this.escapeHtml((room?.amenities || []).join(', '))}" placeholder="King Pillow-top Bed, Marble Bath, Wi-Fi 6, Nespresso">
          </div>
          <div class="form-group span-2">
            <label for="mRoomImage">Suite Photograph</label>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <input type="text" id="mRoomImage" value="${this.escapeHtml(room?.images?.[0] || 'images/room-deluxe.jpg')}" style="flex: 1;" placeholder="Enter image URL or click Upload Photo">
              <button type="button" class="btn-gold" id="btnUploadRoomPhoto" style="white-space: nowrap; padding: 0.6rem 1rem; display: inline-flex; align-items: center; gap: 6px;">
                <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg> Upload Photo
              </button>
              <input type="file" id="fileRoomPhoto" accept="image/*" style="display: none;">
            </div>
            <div style="margin-top: 0.6rem; display: flex; align-items: center; gap: 1rem;">
              <img id="roomPhotoPreview" src="${this.escapeHtml(room?.images?.[0] || 'images/room-deluxe.jpg')}" alt="Preview" style="width: 80px; height: 52px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-gold);" onerror="this.src='images/room-deluxe.jpg'">
              <span id="roomPhotoStatus" style="font-size: 0.8rem; color: var(--text-muted);">Current suite photo</span>
            </div>
          </div>
          <div class="form-group">
            <label for="mRoomUnits">Total Physical Units</label>
            <input type="number" id="mRoomUnits" value="${room?.totalUnits || 5}" min="1">
          </div>
          <div class="form-group">
            <label for="mRoomAvailable">Status</label>
            <select id="mRoomAvailable" class="select-input">
              <option value="true" ${room?.isAvailable !== false ? 'selected' : ''}>Available for Booking</option>
              <option value="false" ${room?.isAvailable === false ? 'selected' : ''}>Blocked / Under Maintenance</option>
            </select>
          </div>
          <div class="form-group span-2" style="margin-top: 1rem;">
            <button type="submit" class="btn-gold">${isEdit ? 'Save Changes & Sync Website' : 'Create Room'}</button>
          </div>
        </form>
      `;

      document.getElementById('crudModal').style.display = 'flex';

      this.setupPhotoUpload({
        buttonId: 'btnUploadRoomPhoto',
        fileInputId: 'fileRoomPhoto',
        urlInputId: 'mRoomImage',
        previewImgId: 'roomPhotoPreview',
        statusId: 'roomPhotoStatus',
        category: 'rooms',
      });

      document.getElementById('roomModalForm').onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
          name: document.getElementById('mRoomName').value.trim(),
          type: document.getElementById('mRoomType').value.trim(),
          price: parseFloat(document.getElementById('mRoomPrice').value),
          capacity: parseInt(document.getElementById('mRoomCapacity').value, 10),
          sizeSqft: parseInt(document.getElementById('mRoomSize').value, 10),
          bedType: document.getElementById('mRoomBed').value.trim(),
          viewType: document.getElementById('mRoomView').value.trim(),
          description: document.getElementById('mRoomDesc').value.trim(),
          amenities: document.getElementById('mRoomAmenities').value.split(',').map((s) => s.trim()).filter(Boolean),
          images: [document.getElementById('mRoomImage').value.trim()],
          totalUnits: parseInt(document.getElementById('mRoomUnits').value, 10),
          isAvailable: document.getElementById('mRoomAvailable').value === 'true',
        };

        try {
          if (isEdit) {
            await XYZ_API.rooms.update(room.id || room.slug, payload);
          } else {
            await XYZ_API.rooms.create(payload);
          }
          this.closeModal();
          this.loadRoomsData();
          this.showBanner('Room inventory updated. Live website reflects new data instantly.');
        } catch (err) {
          alert('Failed to save room: ' + err.message);
        }
      };
    }

    async deleteRoom(idOrSlug) {
      if (!confirm('Are you sure you wish to delete this suite from the live website?')) return;
      try {
        await XYZ_API.rooms.delete(idOrSlug);
        this.loadRoomsData();
        this.showBanner('Room removed from inventory.');
      } catch (err) {
        alert('Failed to delete room: ' + err.message);
      }
    }

    // --------------------------------------------------------------------------
    // 3. Bookings Tab
    // --------------------------------------------------------------------------
    async loadBookingsData() {
      const tbody = document.getElementById('bookingsTableBody');
      tbody.innerHTML = `<tr><td colspan="8" class="loading-td">Fetching reservations...</td></tr>`;

      try {
        const search = document.getElementById('bookingSearchInput').value.trim();
        const status = document.getElementById('bookingStatusFilter').value;

        const bookings = await XYZ_API.bookings.getAll({ search, status });
        if (bookings.length === 0) {
          tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem;">No reservations matching criteria.</td></tr>`;
          return;
        }

        tbody.innerHTML = bookings
          .map((b) => {
            const guestName = b.guest ? `${b.guest.firstName} ${b.guest.lastName}` : b.guestName || 'Guest';
            const guestEmail = b.guest?.email || '';
            const roomName = b.room ? b.room.name : b.roomName || 'Suite';
            const total = (b.totalAmount || 0).toLocaleString('en-IN');
            const dates = `${this.formatDate(b.checkIn)} → ${this.formatDate(b.checkOut)}`;
            const statusClass = (b.status || '').toLowerCase().replace(/_/g, '-');

            return `
              <tr>
                <td><strong style="color: var(--gold-primary);">${b.bookingRef}</strong></td>
                <td>
                  <div style="font-weight: 600; color: #fff;">${this.escapeHtml(guestName)}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${this.escapeHtml(guestEmail)}</div>
                </td>
                <td>${this.escapeHtml(roomName)}</td>
                <td><span style="font-size: 0.8rem;">${dates}</span></td>
                <td>${b.nights}</td>
                <td><strong style="color: var(--gold-primary);">₹${total}</strong></td>
                <td>
                  <select class="select-input" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onchange="window.adminApp.updateBookingStatus('${b.id || b.bookingRef}', this.value)">
                    <option value="PENDING" ${b.status === 'PENDING' ? 'selected' : ''}>Pending</option>
                    <option value="CONFIRMED" ${b.status === 'CONFIRMED' ? 'selected' : ''}>Confirmed</option>
                    <option value="CHECKED_IN" ${b.status === 'CHECKED_IN' ? 'selected' : ''}>Checked In</option>
                    <option value="CHECKED_OUT" ${b.status === 'CHECKED_OUT' ? 'selected' : ''}>Checked Out</option>
                    <option value="CANCELLED" ${b.status === 'CANCELLED' ? 'selected' : ''}>Cancelled</option>
                  </select>
                </td>
                <td>
                  <button class="btn-action-delete" onclick="window.adminApp.deleteBooking('${b.id || b.bookingRef}')">Delete</button>
                </td>
              </tr>
            `;
          })
          .join('');

        // Bind search and filter
        document.getElementById('bookingSearchInput').oninput = () => this.debounce(() => this.loadBookingsData(), 400);
        document.getElementById('bookingStatusFilter').onchange = () => this.loadBookingsData();
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="color: var(--status-danger);">Failed to load bookings: ${err.message}</td></tr>`;
      }
    }

    async updateBookingStatus(id, newStatus) {
      try {
        await XYZ_API.bookings.updateStatus(id, newStatus);
        this.showBanner(`Booking ${id} status updated to ${newStatus}.`);
        this.loadBookingsData();
      } catch (err) {
        alert('Failed to update status: ' + err.message);
      }
    }

    async deleteBooking(id) {
      if (!confirm('Are you sure you wish to delete reservation ' + id + '?')) return;
      try {
        await XYZ_API.bookings.delete(id);
        this.loadBookingsData();
        this.showBanner('Reservation removed.');
      } catch (err) {
        alert('Failed to delete booking: ' + err.message);
      }
    }

    // --------------------------------------------------------------------------
    // 4. Dining Tab
    // --------------------------------------------------------------------------
    async loadDiningData() {
      const tbody = document.getElementById('diningTableBody');
      tbody.innerHTML = `<tr><td colspan="6" class="loading-td">Loading venues...</td></tr>`;

      try {
        const venues = await XYZ_API.dining.getAll(true);
        tbody.innerHTML = venues
          .map((v) => `
            <tr>
              <td><strong style="color: #fff;">${this.escapeHtml(v.name)}</strong></td>
              <td>${this.escapeHtml(v.cuisine)}</td>
              <td><span style="font-size: 0.8rem;">${this.escapeHtml(v.hours)}</span></td>
              <td><span style="font-size: 0.78rem; color: var(--text-secondary);">${this.escapeHtml(v.atmosphere || '-')}</span></td>
              <td><span class="badge ${v.isActive ? 'badge-active' : 'badge-inactive'}">${v.isActive ? 'Open' : 'Closed'}</span></td>
              <td>
                <div class="action-buttons">
                  <button class="btn-action-edit" onclick="window.adminApp.openDiningModal('${v.slug || v.id}')">Edit</button>
                  <button class="btn-action-delete" onclick="window.adminApp.deleteDining('${v.id || v.slug}')">Delete</button>
                </div>
              </td>
            </tr>
          `)
          .join('');

        document.getElementById('addNewVenueBtn').onclick = () => this.openDiningModal(null);

        // Load table reservations
        const resList = await XYZ_API.dining.getReservations();
        const resBody = document.getElementById('diningReservationsBody');
        if (resList.length === 0) {
          resBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 1.5rem;">No table reservations received yet.</td></tr>`;
        } else {
          resBody.innerHTML = resList
            .map((r) => `
              <tr>
                <td><strong style="color: var(--gold-primary);">${r.bookingRef}</strong></td>
                <td>${this.escapeHtml(r.guestName)}</td>
                <td>${this.escapeHtml(r.guestPhone)}</td>
                <td>${this.formatDate(r.reservationDate)} at ${r.timeSlot}</td>
                <td>${r.partySize} Guests</td>
                <td>${this.escapeHtml(r.specialRequests || 'Standard Seating')}</td>
              </tr>
            `)
            .join('');
        }
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="color: var(--status-danger);">Failed to load dining: ${err.message}</td></tr>`;
      }
    }

    async openDiningModal(slugOrId) {
      let venue = null;
      if (slugOrId) {
        venue = await XYZ_API.dining.get(slugOrId);
      }
      const isEdit = Boolean(venue);
      document.getElementById('modalTitle').textContent = isEdit ? `Edit ${venue.name}` : 'Add Dining Venue';

      const body = document.getElementById('modalBody');
      body.innerHTML = `
        <form id="diningModalForm" class="cms-grid-form">
          <div class="form-group span-2">
            <label for="dName">Venue Name</label>
            <input type="text" id="dName" required value="${this.escapeHtml(venue?.name || '')}">
          </div>
          <div class="form-group">
            <label for="dCuisine">Cuisine</label>
            <input type="text" id="dCuisine" required value="${this.escapeHtml(venue?.cuisine || '')}">
          </div>
          <div class="form-group">
            <label for="dHours">Operating Hours</label>
            <input type="text" id="dHours" required value="${this.escapeHtml(venue?.hours || 'Lunch: 12:30 PM - 3:30 PM | Dinner: 7:00 PM - 11:30 PM')}">
          </div>
          <div class="form-group span-2">
            <label for="dDesc">Description</label>
            <textarea id="dDesc" rows="3" required>${this.escapeHtml(venue?.description || '')}</textarea>
          </div>
          <div class="form-group">
            <label for="dAtmos">Atmosphere / Mood</label>
            <input type="text" id="dAtmos" value="${this.escapeHtml(venue?.atmosphere || '')}">
          </div>
          <div class="form-group">
            <label for="dDress">Dress Code</label>
            <input type="text" id="dDress" value="${this.escapeHtml(venue?.dressCode || 'Smart Casual')}">
          </div>
          <div class="form-group span-2">
            <label for="dImage">Venue Photograph / Banner</label>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <input type="text" id="dImage" value="${this.escapeHtml(venue?.images?.[0] || 'images/dining.jpg')}" style="flex: 1;" placeholder="Enter image URL or click Upload Photo">
              <button type="button" class="btn-gold" id="btnUploadDiningPhoto" style="white-space: nowrap; padding: 0.6rem 1rem; display: inline-flex; align-items: center; gap: 6px;">
                <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg> Upload Photo
              </button>
              <input type="file" id="fileDiningPhoto" accept="image/*" style="display: none;">
            </div>
            <div style="margin-top: 0.6rem; display: flex; align-items: center; gap: 1rem;">
              <img id="diningPhotoPreview" src="${this.escapeHtml(venue?.images?.[0] || 'images/dining.jpg')}" alt="Preview" style="width: 80px; height: 52px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-gold);" onerror="this.src='images/dining.jpg'">
              <span id="diningPhotoStatus" style="font-size: 0.8rem; color: var(--text-muted);">Current dining photo</span>
            </div>
          </div>
          <div class="form-group span-2">
            <button type="submit" class="btn-gold">${isEdit ? 'Update Dining Venue' : 'Create Dining Venue'}</button>
          </div>
        </form>
      `;

      document.getElementById('crudModal').style.display = 'flex';

      this.setupPhotoUpload({
        buttonId: 'btnUploadDiningPhoto',
        fileInputId: 'fileDiningPhoto',
        urlInputId: 'dImage',
        previewImgId: 'diningPhotoPreview',
        statusId: 'diningPhotoStatus',
        category: 'dining',
      });

      document.getElementById('diningModalForm').onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
          name: document.getElementById('dName').value.trim(),
          cuisine: document.getElementById('dCuisine').value.trim(),
          hours: document.getElementById('dHours').value.trim(),
          description: document.getElementById('dDesc').value.trim(),
          atmosphere: document.getElementById('dAtmos').value.trim(),
          dressCode: document.getElementById('dDress').value.trim(),
          images: [document.getElementById('dImage').value.trim()],
          isActive: true,
        };

        try {
          if (isEdit) {
            await XYZ_API.dining.update(venue.id || venue.slug, payload);
          } else {
            await XYZ_API.dining.create(payload);
          }
          this.closeModal();
          this.loadDiningData();
          this.showBanner('Dining venue updated successfully.');
        } catch (err) {
          alert('Failed to save venue: ' + err.message);
        }
      };
    }

    async deleteDining(idOrSlug) {
      if (!confirm('Delete this dining venue from the website?')) return;
      try {
        await XYZ_API.dining.delete(idOrSlug);
        this.loadDiningData();
        this.showBanner('Venue removed.');
      } catch (err) {
        alert('Failed to delete venue: ' + err.message);
      }
    }

    // --------------------------------------------------------------------------
    // 5. Amenities Tab
    // --------------------------------------------------------------------------
    async loadAmenitiesData() {
      const tbody = document.getElementById('amenitiesTableBody');
      tbody.innerHTML = `<tr><td colspan="6" class="loading-td">Loading amenities...</td></tr>`;

      try {
        const list = await XYZ_API.amenities.getAll({ all: true });
        tbody.innerHTML = list
          .map((a) => `
            <tr>
              <td><strong style="color: #fff;">${this.escapeHtml(a.name)}</strong></td>
              <td>${this.escapeHtml(a.category)}</td>
              <td><span style="font-size: 0.8rem;">${this.escapeHtml(a.hours || 'Open Daily')}</span></td>
              <td><span style="font-size: 0.78rem; color: var(--text-secondary);">${(a.features || []).slice(0, 3).join(', ')}</span></td>
              <td><span class="badge ${a.isActive ? 'badge-active' : 'badge-inactive'}">${a.isActive ? 'Active' : 'Closed'}</span></td>
              <td>
                <div class="action-buttons">
                  <button class="btn-action-edit" onclick="window.adminApp.openAmenityModal('${a.slug || a.id}')">Edit</button>
                  <button class="btn-action-delete" onclick="window.adminApp.deleteAmenity('${a.id || a.slug}')">Delete</button>
                </div>
              </td>
            </tr>
          `)
          .join('');

        document.getElementById('addNewAmenityBtn').onclick = () => this.openAmenityModal(null);
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="color: var(--status-danger);">Failed to load amenities: ${err.message}</td></tr>`;
      }
    }

    async openAmenityModal(slugOrId) {
      let amenity = null;
      if (slugOrId) amenity = await XYZ_API.amenities.get(slugOrId);
      const isEdit = Boolean(amenity);

      document.getElementById('modalTitle').textContent = isEdit ? `Edit ${amenity.name}` : 'Add Amenity';
      const body = document.getElementById('modalBody');
      body.innerHTML = `
        <form id="amenityModalForm" class="cms-grid-form">
          <div class="form-group span-2">
            <label for="aName">Facility / Spa Name</label>
            <input type="text" id="aName" required value="${this.escapeHtml(amenity?.name || '')}">
          </div>
          <div class="form-group">
            <label for="aCategory">Category</label>
            <select id="aCategory" class="select-input">
              <option value="Wellness" ${amenity?.category === 'Wellness' ? 'selected' : ''}>Wellness & Spa</option>
              <option value="Leisure" ${amenity?.category === 'Leisure' ? 'selected' : ''}>Leisure & Pool</option>
              <option value="Concierge" ${amenity?.category === 'Concierge' ? 'selected' : ''}>Concierge & Fleet</option>
              <option value="Business" ${amenity?.category === 'Business' ? 'selected' : ''}>Business & Salon</option>
            </select>
          </div>
          <div class="form-group">
            <label for="aHours">Hours</label>
            <input type="text" id="aHours" value="${this.escapeHtml(amenity?.hours || 'Daily: 7:00 AM - 10:00 PM')}">
          </div>
          <div class="form-group span-2">
            <label for="aDesc">Description</label>
            <textarea id="aDesc" rows="3" required>${this.escapeHtml(amenity?.description || '')}</textarea>
          </div>
          <div class="form-group span-2">
            <label for="aFeatures">Features (Comma separated)</label>
            <input type="text" id="aFeatures" value="${this.escapeHtml((amenity?.features || []).join(', '))}">
          </div>
          <div class="form-group span-2">
            <button type="submit" class="btn-gold">${isEdit ? 'Save Amenity' : 'Create Amenity'}</button>
          </div>
        </form>
      `;

      document.getElementById('crudModal').style.display = 'flex';

      document.getElementById('amenityModalForm').onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
          name: document.getElementById('aName').value.trim(),
          category: document.getElementById('aCategory').value,
          hours: document.getElementById('aHours').value.trim(),
          description: document.getElementById('aDesc').value.trim(),
          features: document.getElementById('aFeatures').value.split(',').map((s) => s.trim()).filter(Boolean),
        };

        try {
          if (isEdit) {
            await XYZ_API.amenities.update(amenity.id || amenity.slug, payload);
          } else {
            await XYZ_API.amenities.create(payload);
          }
          this.closeModal();
          this.loadAmenitiesData();
          this.showBanner('Amenity catalog updated.');
        } catch (err) {
          alert('Failed to save amenity: ' + err.message);
        }
      };
    }

    async deleteAmenity(idOrSlug) {
      if (!confirm('Remove this amenity from the website?')) return;
      try {
        await XYZ_API.amenities.delete(idOrSlug);
        this.loadAmenitiesData();
        this.showBanner('Amenity removed.');
      } catch (err) {
        alert('Failed to delete: ' + err.message);
      }
    }

    // --------------------------------------------------------------------------
    // 6. Offers Tab
    // --------------------------------------------------------------------------
    async loadOffersData() {
      const tbody = document.getElementById('offersTableBody');
      tbody.innerHTML = `<tr><td colspan="6" class="loading-td">Loading promotional offers...</td></tr>`;

      try {
        const offers = await XYZ_API.offers.getAll(true);
        tbody.innerHTML = offers
          .map((o) => `
            <tr>
              <td>
                <div style="font-weight: 600; color: #fff;">${this.escapeHtml(o.title)}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${this.escapeHtml(o.description.slice(0, 60))}...</div>
              </td>
              <td><span class="badge badge-published">${this.escapeHtml(o.badgeText)}</span></td>
              <td><strong style="color: var(--gold-primary); letter-spacing: 0.08em;">${o.promoCode || '-'}</strong></td>
              <td>${Math.round((o.discountPercent || 0.15) * 100)}% Savings</td>
              <td><span class="badge ${o.isActive ? 'badge-active' : 'badge-inactive'}">${o.isActive ? 'Active' : 'Inactive'}</span></td>
              <td>
                <div class="action-buttons">
                  <button class="btn-action-edit" onclick="window.adminApp.openOfferModal('${o.id}')">Edit</button>
                  <button class="btn-action-delete" onclick="window.adminApp.deleteOffer('${o.id}')">Delete</button>
                </div>
              </td>
            </tr>
          `)
          .join('');

        document.getElementById('addNewOfferBtn').onclick = () => this.openOfferModal(null);
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="color: var(--status-danger);">Failed to load offers: ${err.message}</td></tr>`;
      }
    }

    async openOfferModal(offerId) {
      let offer = null;
      if (offerId) {
        const allOffers = await XYZ_API.offers.getAll(true);
        offer = allOffers.find((o) => o.id === offerId);
      }
      const isEdit = Boolean(offer);
      document.getElementById('modalTitle').textContent = isEdit ? `Edit ${offer.title}` : 'Create Promotion';

      const body = document.getElementById('modalBody');
      body.innerHTML = `
        <form id="offerModalForm" class="cms-grid-form">
          <div class="form-group span-2">
            <label for="oTitle">Offer Title</label>
            <input type="text" id="oTitle" required value="${this.escapeHtml(offer?.title || '')}">
          </div>
          <div class="form-group">
            <label for="oBadge">Badge Text</label>
            <input type="text" id="oBadge" required value="${this.escapeHtml(offer?.badgeText || '20% OFF')}">
          </div>
          <div class="form-group">
            <label for="oPromo">Promo Code</label>
            <input type="text" id="oPromo" value="${this.escapeHtml(offer?.promoCode || 'XYZLUXURY')}" style="text-transform: uppercase;">
          </div>
          <div class="form-group">
            <label for="oDiscount">Discount Fraction (e.g. 0.20 for 20%)</label>
            <input type="number" id="oDiscount" step="0.05" min="0.05" max="0.9" value="${offer?.discountPercent || 0.20}">
          </div>
          <div class="form-group">
            <label for="oActive">Status</label>
            <select id="oActive" class="select-input">
              <option value="true" ${offer?.isActive !== false ? 'selected' : ''}>Active Live</option>
              <option value="false" ${offer?.isActive === false ? 'selected' : ''}>Hidden / Inactive</option>
            </select>
          </div>
          <div class="form-group span-2">
            <label for="oDesc">Offer Description</label>
            <textarea id="oDesc" rows="3" required>${this.escapeHtml(offer?.description || '')}</textarea>
          </div>
          <div class="form-group span-2">
            <label for="oTerms">Terms & Conditions</label>
            <input type="text" id="oTerms" value="${this.escapeHtml(offer?.terms || 'Valid on flexible bookings 30 days prior.')}">
          </div>
          <div class="form-group span-2">
            <label for="oImage">Offer Promotional Banner</label>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <input type="text" id="oImage" value="${this.escapeHtml(offer?.imageUrl || '')}" style="flex: 1;" placeholder="Enter image URL or click Upload Photo">
              <button type="button" class="btn-gold" id="btnUploadOfferPhoto" style="white-space: nowrap; padding: 0.6rem 1rem; display: inline-flex; align-items: center; gap: 6px;">
                <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg> Upload Photo
              </button>
              <input type="file" id="fileOfferPhoto" accept="image/*" style="display: none;">
            </div>
            <div style="margin-top: 0.6rem; display: flex; align-items: center; gap: 1rem;">
              <img id="offerPhotoPreview" src="${this.escapeHtml(offer?.imageUrl || 'images/hero.jpg')}" alt="Preview" style="width: 80px; height: 52px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-gold);" onerror="this.src='images/hero.jpg'">
              <span id="offerPhotoStatus" style="font-size: 0.8rem; color: var(--text-muted);">Current promotional photo</span>
            </div>
          </div>
          <div class="form-group span-2">
            <button type="submit" class="btn-gold">${isEdit ? 'Save Offer' : 'Create Offer'}</button>
          </div>
        </form>
      `;

      document.getElementById('crudModal').style.display = 'flex';

      this.setupPhotoUpload({
        buttonId: 'btnUploadOfferPhoto',
        fileInputId: 'fileOfferPhoto',
        urlInputId: 'oImage',
        previewImgId: 'offerPhotoPreview',
        statusId: 'offerPhotoStatus',
        category: 'offers',
      });

      document.getElementById('offerModalForm').onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
          title: document.getElementById('oTitle').value.trim(),
          badgeText: document.getElementById('oBadge').value.trim(),
          promoCode: document.getElementById('oPromo').value.trim().toUpperCase(),
          discountPercent: parseFloat(document.getElementById('oDiscount').value),
          description: document.getElementById('oDesc').value.trim(),
          terms: document.getElementById('oTerms').value.trim(),
          imageUrl: document.getElementById('oImage').value.trim(),
          isActive: document.getElementById('oActive').value === 'true',
        };

        try {
          if (isEdit) {
            await XYZ_API.offers.update(offer.id, payload);
          } else {
            await XYZ_API.offers.create(payload);
          }
          this.closeModal();
          this.loadOffersData();
          this.showBanner('Promotional offer saved.');
        } catch (err) {
          alert('Failed to save offer: ' + err.message);
        }
      };
    }

    async deleteOffer(id) {
      if (!confirm('Remove this promotional offer?')) return;
      try {
        await XYZ_API.offers.delete(id);
        this.loadOffersData();
        this.showBanner('Offer deleted.');
      } catch (err) {
        alert('Failed to delete offer: ' + err.message);
      }
    }

    // --------------------------------------------------------------------------
    // 7. Reviews Tab
    // --------------------------------------------------------------------------
    async loadReviewsData() {
      const tbody = document.getElementById('reviewsTableBody');
      tbody.innerHTML = `<tr><td colspan="7" class="loading-td">Loading guest reviews...</td></tr>`;

      try {
        const reviews = await XYZ_API.reviews.getAll({ all: 'true' });
        tbody.innerHTML = reviews
          .map((r) => `
            <tr>
              <td><strong style="color: #fff;">${this.escapeHtml(r.authorName)}</strong></td>
              <td><span style="font-size: 0.78rem; color: var(--text-muted);">${this.escapeHtml(r.location || '')} (${this.escapeHtml(r.roomStayed || 'Suite')})</span></td>
              <td><strong style="color: var(--gold-primary);">${'★'.repeat(r.rating || 5)}</strong></td>
              <td><span style="font-size: 0.82rem;">"${this.escapeHtml((r.comment || '').slice(0, 75))}..."</span></td>
              <td>
                <input type="checkbox" ${r.isFeatured ? 'checked' : ''} onchange="window.adminApp.toggleReviewFeatured('${r.id}', this.checked)">
              </td>
              <td>
                <input type="checkbox" ${r.isPublished ? 'checked' : ''} onchange="window.adminApp.toggleReviewPublished('${r.id}', this.checked)">
              </td>
              <td>
                <button class="btn-action-delete" onclick="window.adminApp.deleteReview('${r.id}')">Delete</button>
              </td>
            </tr>
          `)
          .join('');
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="color: var(--status-danger);">Failed to load reviews: ${err.message}</td></tr>`;
      }
    }

    async toggleReviewPublished(id, isPublished) {
      await XYZ_API.reviews.moderate(id, { isPublished });
      this.showBanner('Review status updated.');
    }

    async toggleReviewFeatured(id, isFeatured) {
      await XYZ_API.reviews.moderate(id, { isFeatured });
      this.showBanner('Review featured highlight updated.');
    }

    async deleteReview(id) {
      if (!confirm('Delete this guest review?')) return;
      await XYZ_API.reviews.delete(id);
      this.loadReviewsData();
      this.showBanner('Review deleted.');
    }

    // --------------------------------------------------------------------------
    // 8. CMS & Homepage Tab
    // --------------------------------------------------------------------------
    bindCmsEvents() {
      // Subtab click for CMS Pages
      document.querySelectorAll('.cms-subtab').forEach((tab) => {
        tab.addEventListener('click', (e) => {
          e.preventDefault();
          document.querySelectorAll('.cms-subtab').forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          this.activeCmsPage = tab.dataset.page;
          this.loadCmsPageData(this.activeCmsPage);
        });
      });

      // Hero Form
      const heroForm = document.getElementById('heroCmsForm');
      if (heroForm) {
        heroForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const title = document.getElementById('heroTitle').value.trim();
          const subtitle = document.getElementById('heroSubtitle').value.trim();
          const tagline = document.getElementById('heroTagline').value.trim();
          const badge = document.getElementById('heroAwardBadge').value.trim();

          try {
            await XYZ_API.cms.updateSection('hero', {
              title,
              subtitle,
              contentJson: { tagline, badge },
            });
            this.showBanner('Homepage Hero section updated! Reflects on live homepage.');
          } catch (err) {
            alert('Failed to update hero: ' + err.message);
          }
        });
      }

      // CMS Page Form
      const pageForm = document.getElementById('cmsPageForm');
      if (pageForm) {
        pageForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const title = document.getElementById('cmsPageTitle').value.trim();
          const content = document.getElementById('cmsPageContent').value.trim();

          try {
            await XYZ_API.cms.updatePage(this.activeCmsPage, { title, content });
            this.showBanner(`Institutional page "${title}" updated successfully.`);
          } catch (err) {
            alert('Failed to save page: ' + err.message);
          }
        });
      }
    }

    async loadCmsData() {
      // Load hero section
      try {
        const hero = await XYZ_API.cms.getSection('hero');
        if (hero) {
          document.getElementById('heroTitle').value = hero.title || '';
          document.getElementById('heroSubtitle').value = hero.subtitle || '';
          if (hero.contentJson) {
            document.getElementById('heroTagline').value = hero.contentJson.tagline || 'LUXURY REDEFINED';
            document.getElementById('heroAwardBadge').value = hero.contentJson.badge || 'Forbes Five-Star Award 2026';
          }
        }
      } catch (e) {}

      // Load active CMS page
      this.loadCmsPageData(this.activeCmsPage);
    }

    async loadCmsPageData(slug) {
      try {
        const page = await XYZ_API.cms.getPage(slug);
        if (page) {
          document.getElementById('cmsPageTitle').value = page.title || '';
          document.getElementById('cmsPageContent').value = page.content || '';
        }
      } catch (e) {
        console.error('Error loading page:', e);
      }
    }

    // --------------------------------------------------------------------------
    // 9. Inquiries Tab
    // --------------------------------------------------------------------------
    async loadInquiriesData() {
      const tbody = document.getElementById('inquiriesTableBody');
      tbody.innerHTML = `<tr><td colspan="7" class="loading-td">Loading concierge inquiries...</td></tr>`;

      try {
        const inquiries = await XYZ_API.contact.getAll();
        if (inquiries.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">No concierge tickets submitted yet.</td></tr>`;
        } else {
          tbody.innerHTML = inquiries
            .map((inq) => `
              <tr>
                <td><strong style="color: var(--gold-primary);">${inq.ticketId}</strong></td>
                <td>
                  <div style="font-weight: 600; color: #fff;">${this.escapeHtml(inq.name)}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${this.escapeHtml(inq.email)}</div>
                </td>
                <td>${this.escapeHtml(inq.phone || '-')}</td>
                <td><strong>${this.escapeHtml(inq.subject || 'General Inquiry')}</strong></td>
                <td><span style="font-size: 0.8rem;">${this.escapeHtml(inq.message)}</span></td>
                <td>
                  <select class="select-input" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onchange="window.adminApp.updateInquiryStatus('${inq.id || inq.ticketId}', this.value)">
                    <option value="UNREAD" ${inq.status === 'UNREAD' ? 'selected' : ''}>Unread</option>
                    <option value="READ" ${inq.status === 'READ' ? 'selected' : ''}>Read</option>
                    <option value="IN_PROGRESS" ${inq.status === 'IN_PROGRESS' ? 'selected' : ''}>In Progress</option>
                    <option value="RESOLVED" ${inq.status === 'RESOLVED' ? 'selected' : ''}>Resolved</option>
                  </select>
                </td>
                <td>
                  <button class="btn-action-delete" onclick="window.adminApp.deleteInquiry('${inq.id || inq.ticketId}')">Delete</button>
                </td>
              </tr>
            `)
            .join('');
        }

        // Subscribers
        const subList = await XYZ_API.newsletter.getSubscribers();
        const subBody = document.getElementById('subscribersTableBody');
        if (subList.length === 0) {
          subBody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding: 1.5rem;">No subscribers yet.</td></tr>`;
        } else {
          subBody.innerHTML = subList
            .map((s) => `
              <tr>
                <td><strong style="color: #fff;">${this.escapeHtml(s.email)}</strong></td>
                <td>${this.formatDate(s.subscribedAt)}</td>
                <td><span class="badge badge-active">Active Subscriber</span></td>
              </tr>
            `)
            .join('');
        }
      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="color: var(--status-danger);">Failed to load inquiries: ${err.message}</td></tr>`;
      }
    }

    async updateInquiryStatus(id, status) {
      await XYZ_API.contact.updateStatus(id, status);
      this.showBanner('Ticket status updated.');
    }

    async deleteInquiry(id) {
      if (!confirm('Delete ticket?')) return;
      await XYZ_API.contact.delete(id);
      this.loadInquiriesData();
      this.showBanner('Ticket removed.');
    }

    // --------------------------------------------------------------------------
    // 10. Storage Tab & Photo Upload Utilities
    // --------------------------------------------------------------------------
    setupPhotoUpload({ buttonId, fileInputId, urlInputId, previewImgId, statusId, category }) {
      const btn = document.getElementById(buttonId);
      const input = document.getElementById(fileInputId);
      const urlInput = document.getElementById(urlInputId);
      const previewImg = document.getElementById(previewImgId);
      const statusSpan = document.getElementById(statusId);

      if (!btn || !input) return;

      btn.addEventListener('click', () => input.click());

      input.addEventListener('change', async () => {
        if (!input.files || !input.files.length) return;
        const file = input.files[0];
        if (statusSpan) {
          statusSpan.textContent = `Uploading ${file.name}...`;
          statusSpan.style.color = 'var(--gold-primary)';
        }
        btn.disabled = true;

        try {
          const res = await XYZ_API.storage.upload(file, category);
          const uploadedUrl = res.url || (res.data && res.data.url);
          if (uploadedUrl) {
            if (urlInput) urlInput.value = uploadedUrl;
            if (previewImg) {
              previewImg.src = uploadedUrl;
              previewImg.style.display = 'block';
            }
            if (statusSpan) {
              statusSpan.textContent = 'Photo uploaded successfully!';
              statusSpan.style.color = 'var(--status-success)';
            }
            this.showBanner('Photo uploaded and synced.');
          }
        } catch (err) {
          if (statusSpan) {
            statusSpan.textContent = `Upload failed: ${err.message}`;
            statusSpan.style.color = 'var(--status-danger)';
          }
        } finally {
          btn.disabled = false;
        }
      });
    }

    bindStorageEvents() {
      const fileInput = document.getElementById('mediaFileInput');
      const dropzone = document.getElementById('storageDropzone');
      const statusMsg = document.getElementById('uploadStatusMsg');

      const handleUpload = async (file) => {
        const category = document.getElementById('mediaCategorySelect').value;
        statusMsg.textContent = `Uploading ${file.name} to media registry...`;
        statusMsg.style.color = 'var(--gold-primary)';

        try {
          const res = await XYZ_API.storage.upload(file, category);
          statusMsg.textContent = `Uploaded successfully! URL: ${res.url}`;
          statusMsg.style.color = 'var(--status-success)';
          this.loadStorageData();
          this.showBanner('Media asset uploaded and registered.');
        } catch (err) {
          statusMsg.textContent = `Upload error: ${err.message}`;
          statusMsg.style.color = 'var(--status-danger)';
        }
      };

      if (fileInput) {
        fileInput.addEventListener('change', async () => {
          if (!fileInput.files.length) return;
          await handleUpload(fileInput.files[0]);
        });
      }

      if (dropzone) {
        ['dragenter', 'dragover'].forEach((eventName) => {
          dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.style.borderColor = 'var(--gold-primary)';
            dropzone.style.background = 'rgba(197, 168, 128, 0.08)';
          });
        });

        ['dragleave', 'drop'].forEach((eventName) => {
          dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.style.borderColor = '';
            dropzone.style.background = '';
          });
        });

        dropzone.addEventListener('drop', async (e) => {
          const dt = e.dataTransfer;
          if (dt && dt.files && dt.files.length) {
            await handleUpload(dt.files[0]);
          }
        });
      }
    }

    async loadStorageData() {
      const gallery = document.getElementById('mediaGalleryGrid');
      gallery.innerHTML = `<div class="loading-td">Loading asset library...</div>`;

      try {
        const assets = await XYZ_API.storage.getAssets();
        if (assets.length === 0) {
          gallery.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; color: var(--text-muted); padding: 2rem;">No media assets uploaded yet. Use the uploader above.</div>`;
          return;
        }

        gallery.innerHTML = assets
          .map((a) => `
            <div class="media-card">
              <img src="${a.fileUrl}" alt="${this.escapeHtml(a.altText || '')}" onerror="this.src='images/room-deluxe.jpg'">
              <div class="media-card-info">
                <div class="media-card-name" title="${this.escapeHtml(a.fileName)}">${this.escapeHtml(a.fileName)}</div>
                <button class="btn-copy-url" onclick="navigator.clipboard.writeText('${a.fileUrl}'); alert('Asset URL copied to clipboard: ${a.fileUrl}')">Copy URL</button>
              </div>
            </div>
          `)
          .join('');
      } catch (e) {
        gallery.innerHTML = `<div style="grid-column: 1 / -1; color: var(--text-muted); text-align: center;">Asset library ready for new uploads.</div>`;
      }
    }

    // --------------------------------------------------------------------------
    // 10b. Hotel Cinematic Video Gallery Tab
    // --------------------------------------------------------------------------
    bindGalleryEvents() {
      const filterContainer = document.getElementById('adminGalleryFilters');
      if (filterContainer) {
        filterContainer.addEventListener('click', (e) => {
          const btn = e.target.closest('.filter-pill');
          if (!btn) return;
          filterContainer.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
          btn.classList.add('active');
          this.loadGalleryData(btn.dataset.cat);
        });
      }

      const addBtn = document.getElementById('addNewVideoBtn');
      if (addBtn) {
        addBtn.addEventListener('click', () => this.openVideoModal(null));
      }

      const closePlayerBtn = document.getElementById('closeVideoPlayerBtn');
      const playerModal = document.getElementById('videoPlayerModal');
      if (closePlayerBtn) {
        closePlayerBtn.onclick = () => this.closeVideoPlayer();
      }
      if (playerModal) {
        playerModal.onclick = (e) => {
          if (e.target === playerModal) this.closeVideoPlayer();
        };
      }
    }

    closeVideoPlayer() {
      const modal = document.getElementById('videoPlayerModal');
      const target = document.getElementById('videoPlayerTarget');
      if (modal) modal.style.display = 'none';
      if (target) target.innerHTML = '';
    }

    async loadGalleryData(category = 'All') {
      const grid = document.getElementById('videoGalleryGrid');
      if (!grid) return;
      grid.innerHTML = `<div class="loading-td">Loading hotel video collection...</div>`;

      try {
        const videos = await XYZ_API.gallery.getAll(true, category);
        if (videos.length === 0) {
          grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem 1rem;">
              <p style="margin-bottom: 1rem;">No videos registered for this category yet.</p>
              <button class="btn-gold" onclick="window.adminApp.openVideoModal(null)">Add First Video</button>
            </div>
          `;
          return;
        }

        grid.innerHTML = videos
          .map((v) => `
            <div class="video-admin-card">
              <div class="video-thumb-wrap" onclick="window.adminApp.playVideo('${this.escapeHtml(v.videoUrl)}', '${this.escapeHtml(v.title)}', '${this.escapeHtml(v.description || '')}')">
                <img src="${v.thumbnailUrl || 'images/hero-bg.jpg'}" alt="${this.escapeHtml(v.title)}" onerror="this.src='images/hero-bg.jpg'">
                <div class="video-thumb-overlay">
                  <div class="video-play-btn-circle">
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
                <span class="video-duration-tag">${this.escapeHtml(v.duration || '2:00')}</span>
              </div>
              <div class="video-card-body">
                <div class="video-card-top">
                  <span class="video-cat-badge">${this.escapeHtml(v.category)}</span>
                  ${v.isFeatured ? '<span class="badge badge-confirmed" style="font-size: 0.65rem;">Featured</span>' : ''}
                </div>
                <h3 class="video-card-title">${this.escapeHtml(v.title)}</h3>
                <p class="video-card-desc">${this.escapeHtml(v.description || '')}</p>
                <div class="video-card-footer">
                  <div class="video-status-indicator">
                    <span class="status-dot ${v.isActive ? 'active' : 'inactive'}"></span>
                    <span style="color: ${v.isActive ? '#10b981' : '#9ca3af'};">${v.isActive ? 'Active on Site' : 'Hidden'}</span>
                  </div>
                  <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-action-edit" onclick="window.adminApp.openVideoModal('${v.id}')">Edit</button>
                    <button class="btn-action-delete" onclick="window.adminApp.deleteVideo('${v.id}')">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          `)
          .join('');
      } catch (err) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; color: var(--status-danger);">Failed to load videos: ${err.message}</div>`;
      }
    }

    async openVideoModal(videoId) {
      let video = null;
      if (videoId) {
        video = await XYZ_API.gallery.get(videoId);
      }
      const isEdit = Boolean(video);
      document.getElementById('modalTitle').textContent = isEdit ? `Edit Video: ${video.title}` : 'Add Hotel Showcase Video';

      const body = document.getElementById('modalBody');
      body.innerHTML = `
        <form id="videoModalForm" class="cms-grid-form">
          <div class="form-group span-2">
            <label for="vTitle">Video Showcase Title</label>
            <input type="text" id="vTitle" required value="${this.escapeHtml(video?.title || '')}" placeholder="e.g. Architectural Grandeur & Heritage Sanctuary">
          </div>
          <div class="form-group">
            <label for="vCategory">Showcase Category</label>
            <select id="vCategory" class="select-input">
              <option value="Property Tour" ${video?.category === 'Property Tour' ? 'selected' : ''}>Property Tour & Grounds</option>
              <option value="Suites & Rooms" ${video?.category === 'Suites & Rooms' ? 'selected' : ''}>Suites & Rooms Walkthrough</option>
              <option value="Dining & Bars" ${video?.category === 'Dining & Bars' ? 'selected' : ''}>Dining & Culinary Art</option>
              <option value="Spa & Wellness" ${video?.category === 'Spa & Wellness' ? 'selected' : ''}>Spa & Holistic Wellness</option>
              <option value="Experiences" ${video?.category === 'Experiences' ? 'selected' : ''}>Curated Guest Experiences</option>
            </select>
          </div>
          <div class="form-group">
            <label for="vDuration">Video Duration Display</label>
            <input type="text" id="vDuration" value="${this.escapeHtml(video?.duration || '2:30')}" placeholder="e.g. 2:45">
          </div>
          <div class="form-group span-2">
            <label for="vVideoUrl">Video Stream URL or Direct Upload</label>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <input type="text" id="vVideoUrl" required value="${this.escapeHtml(video?.videoUrl || '')}" style="flex: 1;" placeholder="Paste MP4 URL, YouTube URL, or click Upload Video">
              <button type="button" class="btn-gold" id="btnUploadVideoFile" style="white-space: nowrap; padding: 0.6rem 1rem; display: inline-flex; align-items: center; gap: 6px;">
                <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg> Upload Video
              </button>
              <input type="file" id="fileVideoInput" accept="video/mp4,video/webm,video/quicktime" style="display: none;">
            </div>
            <span id="videoUploadStatus" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem; display: block;">Supports MP4, WEBM up to 50MB, or direct cloud URLs</span>
          </div>
          <div class="form-group span-2">
            <label for="vThumbUrl">Video Poster / Thumbnail Image</label>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <input type="text" id="vThumbUrl" value="${this.escapeHtml(video?.thumbnailUrl || 'images/hero-bg.jpg')}" style="flex: 1;" placeholder="Enter image URL or click Upload Photo">
              <button type="button" class="btn-gold" id="btnUploadVideoThumb" style="white-space: nowrap; padding: 0.6rem 1rem; display: inline-flex; align-items: center; gap: 6px;">
                <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg> Upload Photo
              </button>
              <input type="file" id="fileThumbInput" accept="image/*" style="display: none;">
            </div>
            <div style="margin-top: 0.6rem; display: flex; align-items: center; gap: 1rem;">
              <img id="videoThumbPreview" src="${this.escapeHtml(video?.thumbnailUrl || 'images/hero-bg.jpg')}" alt="Poster Preview" style="width: 90px; height: 52px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-gold);" onerror="this.src='images/hero-bg.jpg'">
              <span id="videoThumbStatus" style="font-size: 0.8rem; color: var(--text-muted);">Cover thumbnail displayed before playback</span>
            </div>
          </div>
          <div class="form-group span-2">
            <label for="vDesc">Video Narrative / Description</label>
            <textarea id="vDesc" rows="3" placeholder="Describe the atmosphere, featured suite, or culinary highlight...">${this.escapeHtml(video?.description || '')}</textarea>
          </div>
          <div class="form-group">
            <label for="vFeatured">Featured Showcase</label>
            <select id="vFeatured" class="select-input">
              <option value="true" ${video?.isFeatured ? 'selected' : ''}>Featured on Live Website</option>
              <option value="false" ${!video?.isFeatured ? 'selected' : ''}>Standard Showcase</option>
            </select>
          </div>
          <div class="form-group">
            <label for="vActive">Visibility Status</label>
            <select id="vActive" class="select-input">
              <option value="true" ${video?.isActive !== false ? 'selected' : ''}>Active / Visible on Site</option>
              <option value="false" ${video?.isActive === false ? 'selected' : ''}>Hidden / Draft</option>
            </select>
          </div>
          <div class="form-group span-2" style="margin-top: 1rem;">
            <button type="submit" class="btn-gold">${isEdit ? 'Save Video Details' : 'Publish Hotel Video'}</button>
          </div>
        </form>
      `;

      document.getElementById('crudModal').style.display = 'flex';

      // Setup Video File Upload
      const btnVid = document.getElementById('btnUploadVideoFile');
      const inputVid = document.getElementById('fileVideoInput');
      const statusVid = document.getElementById('videoUploadStatus');
      const urlVid = document.getElementById('vVideoUrl');
      if (btnVid && inputVid) {
        btnVid.onclick = () => inputVid.click();
        inputVid.onchange = async () => {
          if (!inputVid.files || !inputVid.files.length) return;
          const file = inputVid.files[0];
          statusVid.textContent = `Uploading video file: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`;
          statusVid.style.color = 'var(--gold-primary)';
          btnVid.disabled = true;
          try {
            const res = await XYZ_API.storage.upload(file, 'videos');
            const uploadedUrl = res.url || res.data?.url;
            if (uploadedUrl) {
              urlVid.value = uploadedUrl;
              statusVid.textContent = 'Video file uploaded and registered successfully!';
              statusVid.style.color = 'var(--status-success)';
              this.showBanner('Video file uploaded.');
            }
          } catch (err) {
            statusVid.textContent = `Upload failed: ${err.message}`;
            statusVid.style.color = 'var(--status-danger)';
          } finally {
            btnVid.disabled = false;
          }
        };
      }

      // Setup Thumbnail Photo Upload
      this.setupPhotoUpload({
        buttonId: 'btnUploadVideoThumb',
        fileInputId: 'fileThumbInput',
        urlInputId: 'vThumbUrl',
        previewImgId: 'videoThumbPreview',
        statusId: 'videoThumbStatus',
        category: 'gallery',
      });

      document.getElementById('videoModalForm').onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
          title: document.getElementById('vTitle').value.trim(),
          category: document.getElementById('vCategory').value,
          duration: document.getElementById('vDuration').value.trim(),
          videoUrl: document.getElementById('vVideoUrl').value.trim(),
          thumbnailUrl: document.getElementById('vThumbUrl').value.trim(),
          description: document.getElementById('vDesc').value.trim(),
          isFeatured: document.getElementById('vFeatured').value === 'true',
          isActive: document.getElementById('vActive').value === 'true',
        };

        try {
          if (isEdit) {
            await XYZ_API.gallery.update(video.id, payload);
          } else {
            await XYZ_API.gallery.create(payload);
          }
          this.closeModal();
          this.loadGalleryData();
          this.showBanner('Hotel video saved successfully.');
        } catch (err) {
          alert('Failed to save video: ' + err.message);
        }
      };
    }

    playVideo(videoUrl, title, description) {
      const modal = document.getElementById('videoPlayerModal');
      const target = document.getElementById('videoPlayerTarget');
      const titleEl = document.getElementById('videoPlayerTitle');
      const metaEl = document.getElementById('videoPlayerMeta');

      if (!modal || !target) return;

      titleEl.textContent = title || 'Hotel Showcase Video';
      metaEl.textContent = description || '';

      // Check YouTube
      const ytMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (ytMatch) {
        target.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      } else {
        // Direct HTML5 Video
        target.innerHTML = `
          <video controls autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;">
            <source src="${videoUrl}" type="video/mp4">
            Your browser does not support HTML5 video.
          </video>
        `;
      }

      modal.style.display = 'flex';
    }

    async deleteVideo(id) {
      if (!confirm('Remove this video showcase?')) return;
      try {
        await XYZ_API.gallery.delete(id);
        this.loadGalleryData();
        this.showBanner('Video removed.');
      } catch (err) {
        alert('Failed to delete video: ' + err.message);
      }
    }

    // --------------------------------------------------------------------------
    // 11. Settings Tab
    // --------------------------------------------------------------------------
    async loadSettingsData() {
      try {
        const settings = await XYZ_API.cms.getSettings();
        if (settings.hotel_name) document.getElementById('setHotelName').value = settings.hotel_name;
        if (settings.phone) document.getElementById('setPhone').value = settings.phone;
        if (settings.email) document.getElementById('setEmail').value = settings.email;
        if (settings.address) document.getElementById('setAddress').value = settings.address;
        if (settings.checkin_time) document.getElementById('setCheckIn').value = settings.checkin_time;
        if (settings.checkout_time) document.getElementById('setCheckOut').value = settings.checkout_time;
        if (settings.instagram_url) document.getElementById('setInstagram').value = settings.instagram_url;
        if (settings.facebook_url) document.getElementById('setFacebook').value = settings.facebook_url;

        const form = document.getElementById('hotelSettingsForm');
        form.onsubmit = async (e) => {
          e.preventDefault();
          const payload = {
            hotel_name: document.getElementById('setHotelName').value.trim(),
            phone: document.getElementById('setPhone').value.trim(),
            email: document.getElementById('setEmail').value.trim(),
            address: document.getElementById('setAddress').value.trim(),
            checkin_time: document.getElementById('setCheckIn').value.trim(),
            checkout_time: document.getElementById('setCheckOut').value.trim(),
            instagram_url: document.getElementById('setInstagram').value.trim(),
            facebook_url: document.getElementById('setFacebook').value.trim(),
          };
          try {
            await XYZ_API.cms.updateSettings(payload);
            this.showBanner('Global Hotel Settings updated successfully.');
          } catch (err) {
            alert('Failed to save settings: ' + err.message);
          }
        };
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    }

    // --------------------------------------------------------------------------
    // Helpers & Modals
    // --------------------------------------------------------------------------
    bindModalEvents() {
      const closeBtn = document.getElementById('closeModalBtn');
      const modal = document.getElementById('crudModal');
      if (closeBtn) closeBtn.onclick = () => this.closeModal();
      if (modal) {
        modal.onclick = (e) => {
          if (e.target === modal) this.closeModal();
        };
      }
    }

    closeModal() {
      document.getElementById('crudModal').style.display = 'none';
      document.getElementById('modalBody').innerHTML = '';
    }

    showBanner(msg) {
      const b = document.getElementById('notifBanner');
      b.textContent = msg;
      b.style.display = 'block';
      b.style.background = 'rgba(197, 168, 128, 0.15)';
      b.style.border = '1px solid var(--gold-primary)';
      b.style.color = '#fff';
      b.style.padding = '0.75rem 1.5rem';
      b.style.marginBottom = '1.5rem';
      setTimeout(() => {
        b.style.display = 'none';
      }, 5000);
    }

    formatDate(dateStr) {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    debounce(fn, delay) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(fn, delay);
    }
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminController();
  });
})();
