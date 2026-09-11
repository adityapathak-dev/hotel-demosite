/**
 * ==============================================================================
 * XYZ Hotel — Navigation Authentication & In-Page Modal Engine
 * Dynamically mounts "Sign In" button or User Profile badge to headers.
 * Provides in-page login/registration modal across all website pages.
 * ==============================================================================
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    initNavAuth();
    injectAuthModal();
  });

  function initNavAuth() {
    const headerNav = document.querySelector('.header__nav');
    if (!headerNav) return;

    // Check if user is currently logged in
    const user = window.XYZ_API?.auth?.getUser();

    // Remove any existing auth container
    const existing = document.getElementById('headerAuthContainer');
    if (existing) existing.remove();

    const authContainer = document.createElement('div');
    authContainer.id = 'headerAuthContainer';
    authContainer.style.display = 'inline-flex';
    authContainer.style.alignItems = 'center';

    if (user) {
      // User is logged in: Render profile badge & dropdown
      const initial = (user.name || 'G').charAt(0).toUpperCase();
      const displayName = user.name ? user.name.split(' ')[0] : 'Guest';
      const isStaff = user.role === 'ADMIN' || user.role === 'STAFF';

      authContainer.innerHTML = `
        <div class="nav-user-badge" id="navUserBadge">
          <div class="nav-user-avatar">${initial}</div>
          <span>${escapeHtml(displayName)}</span>
          <svg style="width: 12px; height: 12px; fill: currentColor;" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>

          <div class="nav-user-dropdown" id="navUserDropdown">
            <div class="dropdown-header">
              <strong>${escapeHtml(user.name || 'Valued Guest')}</strong>
              <span>${escapeHtml(user.email || '')}</span>
              ${user.vipLevel ? `<span style="display:block; color: var(--color-gold, #c5a880); font-weight: 600; font-size: 0.7rem;">Tier: ${user.vipLevel}</span>` : ''}
            </div>
            ${isStaff ? `<a href="admin.html" class="dropdown-item">Executive CMS Portal</a>` : ''}
            <a href="booking.html" class="dropdown-item">New Reservation</a>
            <button type="button" class="dropdown-item" id="navMyBookingsBtn">My Reservations</button>
            <button type="button" class="dropdown-item logout-item" id="navLogoutBtn">Sign Out</button>
          </div>
        </div>
      `;

      // Insert before mobile menu toggle or at end of nav
      const menuToggle = headerNav.querySelector('.header__menu-toggle');
      if (menuToggle) {
        headerNav.insertBefore(authContainer, menuToggle);
      } else {
        headerNav.appendChild(authContainer);
      }

      // Dropdown toggle
      const badge = document.getElementById('navUserBadge');
      const dropdown = document.getElementById('navUserDropdown');
      badge?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
      });

      document.addEventListener('click', () => {
        dropdown?.classList.remove('show');
      });

      // Logout handler
      document.getElementById('navLogoutBtn')?.addEventListener('click', () => {
        XYZ_API.auth.logout();
        window.location.reload();
      });

      // My Bookings modal handler
      document.getElementById('navMyBookingsBtn')?.addEventListener('click', async () => {
        dropdown?.classList.remove('show');
        showMyBookingsModal(user);
      });
    } else {
      // User is NOT logged in: Render luxury Sign In button
      authContainer.innerHTML = `
        <button type="button" class="nav-auth-btn" id="headerSignInBtn">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
          <span>Sign In</span>
        </button>
      `;

      const menuToggle = headerNav.querySelector('.header__menu-toggle');
      if (menuToggle) {
        headerNav.insertBefore(authContainer, menuToggle);
      } else {
        headerNav.appendChild(authContainer);
      }

      // Open Modal on click
      document.getElementById('headerSignInBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        openAuthModal('signin');
      });
    }
  }

  // --------------------------------------------------------------------------
  // In-Page Interactive Authentication Modal
  // --------------------------------------------------------------------------
  function injectAuthModal() {
    if (document.getElementById('inPageAuthModal')) return;

    const modal = document.createElement('div');
    modal.id = 'inPageAuthModal';
    modal.className = 'auth-modal-overlay';
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="auth-modal-box">
        <button type="button" class="auth-modal-close" id="closeAuthModalBtn">&times;</button>
        
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <span style="font-family: 'Cinzel', serif; font-size: 1.2rem; color: var(--color-gold, #c5a880); letter-spacing: 0.2em; display: inline-block; border-bottom: 1px solid var(--color-gold, #c5a880); padding-bottom: 0.2rem; margin-bottom: 0.75rem;">XYZ</span>
          <h2 id="modalAuthTitle" style="font-family: 'Cinzel', serif; font-size: 1.5rem; color: #fff;">Guest Sign In</h2>
          <p id="modalAuthSub" style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.25rem;">Access Your Reservations & Privileges</p>
        </div>

        <div style="display: flex; border-bottom: 1px solid rgba(197,168,128,0.2); margin-bottom: 1.5rem;">
          <button type="button" id="mTabSignIn" class="portal-tab active" style="flex: 1; padding: 0.6rem; background: none; border: none; font-size: 0.82rem; color: var(--color-gold, #c5a880); border-bottom: 2px solid var(--color-gold, #c5a880); cursor: pointer; text-transform: uppercase;">Sign In</button>
          <button type="button" id="mTabRegister" class="portal-tab" style="flex: 1; padding: 0.6rem; background: none; border: none; font-size: 0.82rem; color: #94a3b8; border-bottom: 2px solid transparent; cursor: pointer; text-transform: uppercase;">Register</button>
          <button type="button" id="mTabStaff" class="portal-tab" style="flex: 1; padding: 0.6rem; background: none; border: none; font-size: 0.82rem; color: #94a3b8; border-bottom: 2px solid transparent; cursor: pointer; text-transform: uppercase;">Staff CMS</button>
        </div>

        <!-- 1. SIGN IN -->
        <form id="mSignInForm" style="display: flex; flex-direction: column; gap: 1rem;">
          <div class="form-group">
            <label for="mInputEmail" style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8;">Email Address</label>
            <input type="email" id="mInputEmail" required placeholder="guest@example.com or admin@xyzhotel.com" style="background: #0b0f19; border: 1px solid rgba(197,168,128,0.2); color: #fff; padding: 0.7rem 0.9rem;">
          </div>
          <div class="form-group">
            <label for="mInputPassword" style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8;">Password</label>
            <input type="password" id="mInputPassword" required placeholder="••••••••••••" style="background: #0b0f19; border: 1px solid rgba(197,168,128,0.2); color: #fff; padding: 0.7rem 0.9rem;">
          </div>
          <div id="mAuthError" class="auth-error-msg" style="display: none; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #fca5a5; padding: 0.5rem; font-size: 0.8rem;"></div>
          <button type="submit" class="btn-gold-submit" id="mSubmitBtn" style="background: linear-gradient(135deg, #c5a880 0%, #9a7d55 100%); color: #0b0f19; border: none; padding: 0.8rem; font-weight: 600; cursor: pointer; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.5rem;">
            Sign In
          </button>
          <div style="text-align: center; margin-top: 0.25rem;">
            <a href="login.html" style="color: var(--color-gold, #c5a880); font-size: 0.75rem; text-decoration: underline;">Open Full Dedicated Portal Page &rarr;</a>
          </div>
        </form>

        <!-- 2. REGISTER -->
        <form id="mRegisterForm" style="display: none; flex-direction: column; gap: 1rem;">
          <div class="form-group">
            <label for="mRegName" style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8;">Full Name</label>
            <input type="text" id="mRegName" required placeholder="e.g. Vikram Mehta" style="background: #0b0f19; border: 1px solid rgba(197,168,128,0.2); color: #fff; padding: 0.7rem 0.9rem;">
          </div>
          <div class="form-group">
            <label for="mRegEmail" style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8;">Email Address</label>
            <input type="email" id="mRegEmail" required placeholder="name@example.com" style="background: #0b0f19; border: 1px solid rgba(197,168,128,0.2); color: #fff; padding: 0.7rem 0.9rem;">
          </div>
          <div class="form-group">
            <label for="mRegPassword" style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8;">Create Password</label>
            <input type="password" id="mRegPassword" required placeholder="At least 6 characters" minlength="6" style="background: #0b0f19; border: 1px solid rgba(197,168,128,0.2); color: #fff; padding: 0.7rem 0.9rem;">
          </div>
          <button type="submit" class="btn-gold-submit" id="mRegSubmitBtn" style="background: linear-gradient(135deg, #c5a880 0%, #9a7d55 100%); color: #0b0f19; border: none; padding: 0.8rem; font-weight: 600; cursor: pointer; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.5rem;">
            Register Account
          </button>
        </form>

      </div>
    `;

    document.body.appendChild(modal);

    // Modal Events
    document.getElementById('closeAuthModalBtn')?.addEventListener('click', closeAuthModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAuthModal();
    });

    // Tab switching inside modal
    const tabIn = document.getElementById('mTabSignIn');
    const tabReg = document.getElementById('mTabRegister');
    const tabStaff = document.getElementById('mTabStaff');
    const fIn = document.getElementById('mSignInForm');
    const fReg = document.getElementById('mRegisterForm');

    tabIn?.addEventListener('click', () => {
      tabIn.style.color = 'var(--color-gold, #c5a880)';
      tabIn.style.borderBottomColor = 'var(--color-gold, #c5a880)';
      tabReg.style.color = '#94a3b8';
      tabReg.style.borderBottomColor = 'transparent';
      tabStaff.style.color = '#94a3b8';
      tabStaff.style.borderBottomColor = 'transparent';
      fIn.style.display = 'flex';
      fReg.style.display = 'none';
      document.getElementById('modalAuthTitle').textContent = 'Guest Sign In';
    });

    tabReg?.addEventListener('click', () => {
      tabReg.style.color = 'var(--color-gold, #c5a880)';
      tabReg.style.borderBottomColor = 'var(--color-gold, #c5a880)';
      tabIn.style.color = '#94a3b8';
      tabIn.style.borderBottomColor = 'transparent';
      tabStaff.style.color = '#94a3b8';
      tabStaff.style.borderBottomColor = 'transparent';
      fIn.style.display = 'none';
      fReg.style.display = 'flex';
      document.getElementById('modalAuthTitle').textContent = 'Register Guest';
    });

    tabStaff?.addEventListener('click', () => {
      window.location.href = 'admin.html';
    });

    // Handle Modal Sign In Submit
    fIn?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('mInputEmail').value.trim();
      const password = document.getElementById('mInputPassword').value.trim();
      const errDiv = document.getElementById('mAuthError');
      const btn = document.getElementById('mSubmitBtn');

      errDiv.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Authenticating...';

      try {
        const res = await XYZ_API.auth.login(email, password);
        if (res.success) {
          closeAuthModal();
          initNavAuth();
          if (res.user.role === 'ADMIN' || res.user.role === 'STAFF') {
            window.location.href = 'admin.html';
          }
        } else {
          errDiv.textContent = res.message || 'Authentication failed';
          errDiv.style.display = 'block';
        }
      } catch (err) {
        errDiv.textContent = err.message || 'Authentication error';
        errDiv.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });

    // Handle Modal Register Submit
    fReg?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('mRegName').value.trim();
      const email = document.getElementById('mRegEmail').value.trim();
      const password = document.getElementById('mRegPassword').value.trim();
      const errDiv = document.getElementById('mAuthError');
      const btn = document.getElementById('mRegSubmitBtn');

      btn.disabled = true;
      btn.textContent = 'Creating Account...';

      try {
        const res = await XYZ_API.auth.register(name, email, password);
        if (res.success) {
          closeAuthModal();
          initNavAuth();
          alert(`Welcome to XYZ Hotel, ${name}! Your account has been registered.`);
        }
      } catch (err) {
        alert(err.message || 'Registration failed');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Register Account';
      }
    });
  }

  function openAuthModal() {
    const modal = document.getElementById('inPageAuthModal');
    if (modal) modal.style.display = 'flex';
  }

  function closeAuthModal() {
    const modal = document.getElementById('inPageAuthModal');
    if (modal) modal.style.display = 'none';
  }

  // --------------------------------------------------------------------------
  // My Reservations Modal
  // --------------------------------------------------------------------------
  async function showMyBookingsModal(user) {
    let bookings = [];
    try {
      bookings = await XYZ_API.bookings.getAll({ search: user.email });
    } catch (e) {}

    const overlay = document.createElement('div');
    overlay.className = 'auth-modal-overlay';
    overlay.innerHTML = `
      <div class="auth-modal-box" style="max-width: 600px;">
        <button type="button" class="auth-modal-close" onclick="this.closest('.auth-modal-overlay').remove()">&times;</button>
        <h2 style="font-family: 'Cinzel', serif; font-size: 1.3rem; color: #fff; margin-bottom: 0.5rem;">My Reservations</h2>
        <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 1.5rem;">Active and past bookings under ${escapeHtml(user.email)}</p>

        <div style="max-height: 350px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem;">
          ${
            bookings.length === 0
              ? `<div style="text-align: center; color: #94a3b8; padding: 2rem;">No active reservations found under your account.</div>`
              : bookings
                  .map(
                    (b) => `
              <div style="background: #0b0f19; border: 1px solid rgba(197,168,128,0.2); padding: 1rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="color: var(--color-gold, #c5a880); font-size: 0.95rem;">${b.bookingRef}</strong>
                  <div style="color: #fff; font-size: 0.85rem; font-weight: 500;">${escapeHtml(b.room?.name || b.roomName || 'Luxury Suite')}</div>
                  <div style="color: #94a3b8; font-size: 0.78rem;">${b.checkIn} &rarr; ${b.checkOut} (${b.nights} Nights)</div>
                </div>
                <div style="text-align: right;">
                  <strong style="color: #fff; display: block;">₹${(b.totalAmount || 0).toLocaleString('en-IN')}</strong>
                  <span style="font-size: 0.72rem; padding: 0.2rem 0.5rem; background: rgba(16,185,129,0.15); color: #34d399; text-transform: uppercase;">${b.status}</span>
                </div>
              </div>
            `
                  )
                  .join('')
          }
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.openAuthModal = openAuthModal;
})();
