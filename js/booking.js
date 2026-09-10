/* ============================================
   XYZ HOTEL — Booking Engine Logic
   Supports Online Multi-Step Booking & Offline Concierge Requests
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initBookingEngine();
});

const ROOM_DATA = {
  deluxe: {
    id: 'deluxe',
    name: 'Deluxe King Room',
    type: 'Signature Luxury',
    price: 12500,
    image: 'images/room-deluxe.jpg',
    description: 'Spacious 48m² room with panoramic city view, king bed, and Italian marble bath.'
  },
  suite: {
    id: 'suite',
    name: 'Premier Skyline Suite',
    type: 'Executive Collection',
    price: 28000,
    image: 'images/room-suite.jpg',
    description: '75m² suite with separate lounge, 24/7 dedicated butler service, and club lounge access.'
  },
  presidential: {
    id: 'presidential',
    name: 'The Presidential Royal Suite',
    type: 'Crown Jewel',
    price: 65000,
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80',
    description: '180m² penthouse with private rooftop terrace, dining salon, and Rolls-Royce chauffeur.'
  },
  villa: {
    id: 'villa',
    name: 'Garden Plunge Pool Villa',
    type: 'Private Haven',
    price: 42000,
    image: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=1200&q=80',
    description: '95m² secluded haven with heated private plunge pool and daily champagne breakfast.'
  }
};

function initBookingEngine() {
  // State
  const state = {
    step: 1,
    selectedRoom: 'deluxe',
    checkin: '',
    checkout: '',
    nights: 2,
    guests: '2 Adults',
    roomsCount: 1,
    discountPercent: 0,
    appliedPromo: '',
    addons: {
      breakfast: false,
      transfer: false,
      spa: false
    },
    guestDetails: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      specialRequests: ''
    }
  };

  // 1. Parse URL parameters from homepage widget or room page
  const params = new URLSearchParams(window.location.search);
  if (params.get('room') && ROOM_DATA[params.get('room')]) {
    state.selectedRoom = params.get('room');
  }

  // Set default dates if not provided
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 3);

  const formatDate = (d) => d.toISOString().split('T')[0];
  state.checkin = params.get('checkin') || formatDate(tomorrow);
  state.checkout = params.get('checkout') || formatDate(dayAfter);
  state.guests = params.get('guests') ? `${params.get('guests')} Adults` : '2 Adults';
  state.roomsCount = parseInt(params.get('rooms')) || 1;

  // Calculate nights
  const calcNights = () => {
    const d1 = new Date(state.checkin);
    const d2 = new Date(state.checkout);
    const diffTime = d2 - d1;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    state.nights = diffDays > 0 ? diffDays : 1;
  };
  calcNights();

  // Elements
  const stepElements = {
    step1: document.getElementById('step1Content'),
    step2: document.getElementById('step2Content'),
    step3: document.getElementById('step3Content'),
    indicator1: document.getElementById('stepIndicator1'),
    indicator2: document.getElementById('stepIndicator2'),
    indicator3: document.getElementById('stepIndicator3'),
  };

  const summaryElements = {
    roomName: document.getElementById('sumRoomName'),
    checkin: document.getElementById('sumCheckin'),
    checkout: document.getElementById('sumCheckout'),
    nights: document.getElementById('sumNights'),
    guests: document.getElementById('sumGuests'),
    ratePerNight: document.getElementById('sumRatePerNight'),
    subtotal: document.getElementById('sumSubtotal'),
    discountRow: document.getElementById('sumDiscountRow'),
    discountVal: document.getElementById('sumDiscountVal'),
    addonsTotal: document.getElementById('sumAddonsTotal'),
    tax: document.getElementById('sumTax'),
    total: document.getElementById('sumTotal'),
    ctaBtn: document.getElementById('summaryCtaBtn')
  };

  // Sync Input Dates
  const inputCheckin = document.getElementById('filterCheckin');
  const inputCheckout = document.getElementById('filterCheckout');
  const inputGuests = document.getElementById('filterGuests');

  if (inputCheckin) {
    inputCheckin.value = state.checkin;
    inputCheckin.addEventListener('change', (e) => {
      state.checkin = e.target.value;
      calcNights();
      updateSummary();
    });
  }

  if (inputCheckout) {
    inputCheckout.value = state.checkout;
    inputCheckout.addEventListener('change', (e) => {
      state.checkout = e.target.value;
      calcNights();
      updateSummary();
    });
  }

  if (inputGuests) {
    inputGuests.addEventListener('change', (e) => {
      state.guests = `${e.target.value} Adults`;
      updateSummary();
    });
  }

  // Room Option selection listeners
  const roomCards = document.querySelectorAll('.room-option');
  roomCards.forEach(card => {
    card.addEventListener('click', () => {
      const roomId = card.getAttribute('data-room-id');
      if (roomId && ROOM_DATA[roomId]) {
        state.selectedRoom = roomId;
        roomCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        updateSummary();
      }
    });
  });

  // Select initial room card
  const initialCard = document.querySelector(`.room-option[data-room-id="${state.selectedRoom}"]`);
  if (initialCard) initialCard.classList.add('selected');

  // Addons Listeners
  const addonBreakfast = document.getElementById('addonBreakfast');
  const addonTransfer = document.getElementById('addonTransfer');
  const addonSpa = document.getElementById('addonSpa');

  if (addonBreakfast) {
    addonBreakfast.addEventListener('change', (e) => {
      state.addons.breakfast = e.target.checked;
      updateSummary();
    });
  }
  if (addonTransfer) {
    addonTransfer.addEventListener('change', (e) => {
      state.addons.transfer = e.target.checked;
      updateSummary();
    });
  }
  if (addonSpa) {
    addonSpa.addEventListener('change', (e) => {
      state.addons.spa = e.target.checked;
      updateSummary();
    });
  }

  // Promo Code
  const promoInput = document.getElementById('promoInput');
  const promoBtn = document.getElementById('applyPromoBtn');
  const promoMsg = document.getElementById('promoMessage');

  promoBtn?.addEventListener('click', () => {
    const code = promoInput.value.trim().toUpperCase();
    if (code === 'XYZLUXURY' || code === 'TAJROYAL' || code === 'WELCOME15') {
      state.discountPercent = 0.15;
      state.appliedPromo = code;
      if (promoMsg) {
        promoMsg.textContent = `Promo code ${code} applied (15% OFF)!`;
        promoMsg.style.color = 'var(--success)';
      }
    } else if (code === '') {
      state.discountPercent = 0;
      if (promoMsg) promoMsg.textContent = '';
    } else {
      state.discountPercent = 0;
      if (promoMsg) {
        promoMsg.textContent = 'Invalid promo code. Try "XYZLUXURY"';
        promoMsg.style.color = '#e53935';
      }
    }
    updateSummary();
  });

  // Update Summary calculation
  function updateSummary() {
    const room = ROOM_DATA[state.selectedRoom];
    if (!room) return;

    if (summaryElements.roomName) summaryElements.roomName.textContent = room.name;
    if (summaryElements.checkin) summaryElements.checkin.textContent = state.checkin;
    if (summaryElements.checkout) summaryElements.checkout.textContent = state.checkout;
    if (summaryElements.nights) summaryElements.nights.textContent = `${state.nights} ${state.nights === 1 ? 'Night' : 'Nights'}`;
    if (summaryElements.guests) summaryElements.guests.textContent = state.guests;
    if (summaryElements.ratePerNight) summaryElements.ratePerNight.textContent = `₹${room.price.toLocaleString('en-IN')}`;

    const rawSubtotal = room.price * state.nights * state.roomsCount;
    const discountAmount = Math.round(rawSubtotal * state.discountPercent);
    const subtotal = rawSubtotal - discountAmount;

    if (state.discountPercent > 0 && summaryElements.discountRow) {
      summaryElements.discountRow.style.display = 'flex';
      if (summaryElements.discountVal) summaryElements.discountVal.textContent = `-₹${discountAmount.toLocaleString('en-IN')}`;
    } else if (summaryElements.discountRow) {
      summaryElements.discountRow.style.display = 'none';
    }

    // Addons
    let addonsTotal = 0;
    if (state.addons.breakfast) addonsTotal += (2500 * state.nights); // ₹2,500/night for 2
    if (state.addons.transfer) addonsTotal += 4500; // ₹4,500 roundtrip
    if (state.addons.spa) addonsTotal += 8500; // ₹8,500 couple spa

    if (summaryElements.addonsTotal) {
      summaryElements.addonsTotal.textContent = `₹${addonsTotal.toLocaleString('en-IN')}`;
    }

    if (summaryElements.subtotal) {
      summaryElements.subtotal.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
    }

    const tax = Math.round((subtotal + addonsTotal) * 0.18); // 18% luxury GST
    const total = subtotal + addonsTotal + tax;

    if (summaryElements.tax) summaryElements.tax.textContent = `₹${tax.toLocaleString('en-IN')}`;
    if (summaryElements.total) summaryElements.total.textContent = `₹${total.toLocaleString('en-IN')}`;

    // Update CTA button text based on step
    if (summaryElements.ctaBtn) {
      if (state.step === 1) {
        summaryElements.ctaBtn.textContent = 'Continue to Guest Details →';
      } else if (state.step === 2) {
        summaryElements.ctaBtn.textContent = `Confirm & Pay ₹${total.toLocaleString('en-IN')}`;
      } else {
        summaryElements.ctaBtn.textContent = 'Booking Confirmed ✓';
        summaryElements.ctaBtn.disabled = true;
      }
    }
  }

  // Step transitions
  function goToStep(stepNumber) {
    state.step = stepNumber;

    // Reset steps
    stepElements.step1.style.display = 'none';
    stepElements.step2.style.display = 'none';
    stepElements.step3.style.display = 'none';

    stepElements.indicator1.className = 'booking-step';
    stepElements.indicator2.className = 'booking-step';
    stepElements.indicator3.className = 'booking-step';

    if (stepNumber === 1) {
      stepElements.step1.style.display = 'block';
      stepElements.indicator1.classList.add('active');
    } else if (stepNumber === 2) {
      stepElements.step2.style.display = 'block';
      stepElements.indicator1.classList.add('completed');
      stepElements.indicator2.classList.add('active');
    } else if (stepNumber === 3) {
      stepElements.step3.style.display = 'block';
      stepElements.indicator1.classList.add('completed');
      stepElements.indicator2.classList.add('completed');
      stepElements.indicator3.classList.add('completed');
    }

    updateSummary();
    window.scrollTo({ top: 120, behavior: 'smooth' });
  }

  // Summary CTA Click
  summaryElements.ctaBtn?.addEventListener('click', () => {
    if (state.step === 1) {
      goToStep(2);
    } else if (state.step === 2) {
      // Validate Guest Form
      const form = document.getElementById('guestForm');
      if (form && !form.checkValidity()) {
        form.reportValidity();
        return;
      }
      populateConfirmation();
      goToStep(3);
    }
  });

  // Back to Step 1 button
  document.getElementById('backToStep1Btn')?.addEventListener('click', () => {
    goToStep(1);
  });

  // Guest Form Submit
  document.getElementById('guestForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    populateConfirmation();
    goToStep(3);
  });

  // Populate Confirmation Details
  function populateConfirmation() {
    const ref = 'XYZ-' + Math.floor(100000 + Math.random() * 900000);
    const fName = document.getElementById('guestFirstName')?.value || 'Valued';
    const lName = document.getElementById('guestLastName')?.value || 'Guest';
    const email = document.getElementById('guestEmail')?.value || 'guest@example.com';
    const phone = document.getElementById('guestPhone')?.value || '+91 98765 43210';

    const refEl = document.getElementById('confBookingRef');
    if (refEl) refEl.textContent = ref;

    const nameEl = document.getElementById('confGuestName');
    if (nameEl) nameEl.textContent = `${fName} ${lName}`;

    const datesEl = document.getElementById('confDates');
    if (datesEl) datesEl.textContent = `${state.checkin} to ${state.checkout} (${state.nights} Nights)`;

    const roomEl = document.getElementById('confRoom');
    if (roomEl) roomEl.textContent = ROOM_DATA[state.selectedRoom].name;

    const emailEl = document.getElementById('confEmail');
    if (emailEl) emailEl.textContent = email;
  }

  // Offline Callback Form Handler
  const offlineForm = document.getElementById('offlineCallbackForm');
  const offlineSuccess = document.getElementById('offlineSuccessAlert');
  offlineForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = offlineForm.querySelector('button[type="submit"]');
    btn.textContent = 'Submitting Request...';
    btn.disabled = true;

    setTimeout(() => {
      offlineForm.style.display = 'none';
      if (offlineSuccess) offlineSuccess.style.display = 'block';
    }, 900);
  });

  // Initial update
  updateSummary();
}
