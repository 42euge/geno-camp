const cart = [];
let activePlatforms = new Set();
let allPlatforms = [];
let mapInstance = null;
let mapMarkers = [];
let mapVisible = false;
let allSites = [];

async function init() {
  await loadRegions();
  await loadPlatforms();
  await loadCampsites();
}

async function loadRegions() {
  const res = await fetch("/api/regions");
  const regions = await res.json();
  const select = document.getElementById("regionFilter");
  regions.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    select.appendChild(opt);
  });
}

async function loadPlatforms() {
  const res = await fetch("/api/platforms");
  allPlatforms = await res.json();
  activePlatforms = new Set(allPlatforms);
  renderPlatformTags();
}

function renderPlatformTags() {
  const container = document.getElementById("platformTags");
  container.innerHTML = '<span class="platform-label">Platforms:</span>' +
    allPlatforms.map((p) => `
      <button class="platform-tag ${activePlatforms.has(p) ? "active" : ""}"
              onclick="togglePlatform('${p}')">
        ${getPlatformIcon(p)} ${p}
      </button>
    `).join("");
}

function getPlatformIcon(platform) {
  const icons = { GoingToCamp: "🏛️", Hipcamp: "⛺" };
  return icons[platform] || "📍";
}

function togglePlatform(platform) {
  if (activePlatforms.has(platform)) {
    activePlatforms.delete(platform);
  } else {
    activePlatforms.add(platform);
  }
  renderPlatformTags();
  loadCampsites();
}

async function loadCampsites() {
  const params = new URLSearchParams({
    region: document.getElementById("regionFilter").value,
    showerType: document.getElementById("showerFilter").value,
    siteType: document.getElementById("siteFilter").value,
    sort: document.getElementById("sortFilter").value,
    platforms: [...activePlatforms].join(","),
  });

  const res = await fetch(`/api/campsites?${params}`);
  allSites = await res.json();
  renderGrid(allSites);
  if (mapVisible) updateMap(allSites);
}

function renderGrid(sites) {
  const grid = document.getElementById("campsiteGrid");
  if (sites.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>No campsites match your filters.<br>Try toggling some platforms back on.</p></div>';
    return;
  }
  grid.innerHTML = sites.map((site) => `
    <div class="campsite-card" onclick="openDetail('${site.id}')">
      <img class="card-image" src="${site.image}" alt="${site.name}" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22200%22><rect fill=%22%232d5a3d%22 width=%22400%22 height=%22200%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22white%22 font-size=%2218%22>🏕️ ${encodeURIComponent(site.name)}</text></svg>'">
      <div class="card-body">
        <div class="card-region">${site.region}</div>
        <div class="card-name">${site.name}</div>
        <div class="card-location">${site.location} · ${site.driveFromSeattle} from Seattle</div>
        <div class="card-meta">
          <span class="meta-badge badge-rating">★ ${site.rating} (${site.reviews})</span>
          <span class="meta-badge badge-price">$${site.pricePerNight}/night</span>
          <span class="meta-badge badge-shower">🚿 ${showerLabel(site.showers.type)}</span>
          <span class="meta-badge badge-platform">${getPlatformIcon(site.platform)} ${site.platform}</span>
        </div>
        <div class="card-highlight">${site.highlights}</div>
        ${site.alerts.length ? `<div class="card-alerts">${site.alerts.map((a) => `<span class="alert-tag">⚠️ ${a}</span>`).join(" ")}</div>` : ""}
        <div class="card-footer">
          <button class="btn-add ${isInCart(site.id) ? "added" : ""}" onclick="event.stopPropagation(); addToCart('${site.id}')">
            ${isInCart(site.id) ? "✓ In Cart" : "Add to Trip"}
          </button>
          <button class="btn-detail" onclick="event.stopPropagation(); openDetail('${site.id}')">Details</button>
        </div>
      </div>
    </div>
  `).join("");
}

function showerLabel(type) {
  return { free: "Free", "coin-op": "Coin-op", token: "Token", available: "Available" }[type] || type;
}

function isInCart(id) {
  return cart.some((item) => item.campsiteId === id);
}

// --- Map ---

function toggleView() {
  mapVisible = !mapVisible;
  const pane = document.getElementById("mapPane");
  const layout = document.getElementById("mainLayout");
  const icon = document.getElementById("viewIcon");
  const label = document.getElementById("viewLabel");

  if (mapVisible) {
    pane.style.display = "block";
    layout.classList.add("with-map");
    icon.textContent = "📋";
    label.textContent = "List";
    if (!mapInstance) initMap();
    updateMap(allSites);
    setTimeout(() => mapInstance?.invalidateSize(), 300);
  } else {
    pane.style.display = "none";
    layout.classList.remove("with-map");
    icon.textContent = "🗺️";
    label.textContent = "Map";
  }
}

function initMap() {
  mapInstance = L.map("map").setView([47.5, -121.5], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(mapInstance);
}

function updateMap(sites) {
  if (!mapInstance) return;
  mapMarkers.forEach((m) => mapInstance.removeLayer(m));
  mapMarkers = [];

  sites.forEach((site) => {
    if (!site.lat || !site.lng) return;

    const color = site.platform === "Hipcamp" ? "#e8642c" : "#2d5a3d";
    const marker = L.circleMarker([site.lat, site.lng], {
      radius: 10,
      fillColor: color,
      color: "#fff",
      weight: 2,
      fillOpacity: 0.9,
    }).addTo(mapInstance);

    marker.bindPopup(`
      <div style="min-width:200px">
        <strong>${site.name}</strong><br>
        <span style="color:#666">${site.location}</span><br>
        <span>★ ${site.rating} · $${site.pricePerNight}/night · 🚿 ${showerLabel(site.showers.type)}</span><br>
        <button onclick="openDetail('${site.id}')" style="margin-top:6px;padding:4px 12px;background:#2d5a3d;color:#fff;border:none;border-radius:6px;cursor:pointer">View Details</button>
      </div>
    `);

    marker.on("mouseover", function () { this.openPopup(); });
    mapMarkers.push(marker);
  });

  if (sites.length > 0) {
    const bounds = L.latLngBounds(sites.filter((s) => s.lat).map((s) => [s.lat, s.lng]));
    mapInstance.fitBounds(bounds, { padding: [30, 30] });
  }
}

// --- Availability Calendar ---

function renderAvailabilityCalendar(availability) {
  if (!availability || Object.keys(availability).length === 0) {
    return '<p style="color:#6b6b6b; font-size:13px">Availability data not yet loaded. Check the booking platform for real-time availability.</p>';
  }

  const months = {};
  Object.entries(availability).forEach(([date, data]) => {
    const d = new Date(date + "T12:00:00");
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!months[key]) months[key] = [];
    months[key].push({ date, day: d.getDate(), dayOfWeek: d.getDay(), ...data });
  });

  return Object.entries(months).map(([monthKey, days]) => {
    const [year, month] = monthKey.split("-");
    const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
    const firstDay = days[0].dayOfWeek;

    return `
      <div class="cal-month">
        <div class="cal-month-name">${monthName}</div>
        <div class="cal-grid">
          <span class="cal-dow">Su</span><span class="cal-dow">Mo</span><span class="cal-dow">Tu</span>
          <span class="cal-dow">We</span><span class="cal-dow">Th</span><span class="cal-dow">Fr</span><span class="cal-dow">Sa</span>
          ${"<span></span>".repeat(firstDay)}
          ${days.map((d) => {
            const pct = d.total > 0 ? d.available / d.total : 0;
            let cls = "cal-day";
            if (pct === 0) cls += " cal-none";
            else if (pct < 0.25) cls += " cal-low";
            else if (pct < 0.5) cls += " cal-med";
            else cls += " cal-high";
            return `<span class="${cls}" title="${d.date}: ${d.available}/${d.total} sites available">${d.day}</span>`;
          }).join("")}
        </div>
      </div>
    `;
  }).join("");
}

// --- Detail Modal ---

async function openDetail(id) {
  const res = await fetch(`/api/campsites/${id}`);
  const site = await res.json();

  const reviewsHtml = (site.socialReviews || []).map((r) => `
    <div class="review-card">
      <div class="review-header">
        <span class="review-source">${r.source}</span>
        <span class="review-date">${r.date}</span>
      </div>
      <div class="review-user">${r.user}</div>
      <div class="review-text">"${r.text}"</div>
    </div>
  `).join("");

  document.getElementById("modalContent").innerHTML = `
    <img class="modal-image" src="${site.image}" alt="${site.name}"
         onerror="this.style.background='#2d5a3d';this.style.height='120px'">
    <div class="modal-body">
      <div class="modal-name">${site.name}</div>
      <div class="modal-location">${site.location} · ${site.region} · ${site.driveFromSeattle} from Seattle</div>

      <div class="card-meta" style="margin: 16px 0">
        <span class="meta-badge badge-rating">★ ${site.rating} (${site.reviews} reviews)</span>
        <span class="meta-badge badge-price">$${site.pricePerNight}/night${site.reservationFee ? ` + $${site.reservationFee} fee` : ""}</span>
        <span class="meta-badge badge-platform">${getPlatformIcon(site.platform)} ${site.platform}</span>
      </div>

      <p style="font-size:15px; line-height:1.6; margin-bottom:16px">${site.highlights}</p>

      <div class="modal-section">
        <h3>🚿 Shower Details</h3>
        <div class="shower-detail">
          <strong>Type:</strong> ${site.showers.type} · <strong>Cost:</strong> ${site.showers.cost}<br>
          <strong>Hours:</strong> ${site.showers.hours} · <strong>Season:</strong> ${site.showers.seasonal}
        </div>
      </div>

      <div class="modal-section">
        <h3>📅 Availability — Summer 2026</h3>
        <div class="cal-legend">
          <span class="cal-legend-item"><span class="cal-swatch cal-high"></span> Many open</span>
          <span class="cal-legend-item"><span class="cal-swatch cal-med"></span> Some left</span>
          <span class="cal-legend-item"><span class="cal-swatch cal-low"></span> Almost full</span>
          <span class="cal-legend-item"><span class="cal-swatch cal-none"></span> Sold out</span>
        </div>
        <div class="cal-container">
          ${renderAvailabilityCalendar(site.availability)}
        </div>
      </div>

      <div class="modal-section">
        <h3>Amenities</h3>
        <div class="amenity-list">
          ${site.amenities.map((a) => `<span class="amenity-tag">${a}</span>`).join("")}
        </div>
      </div>

      <div class="modal-section">
        <h3>Site Types</h3>
        <div class="amenity-list">
          ${site.siteTypes.map((t) => `<span class="amenity-tag">${t}</span>`).join("")}
        </div>
      </div>

      <div class="modal-section">
        <h3>Details</h3>
        <p style="font-size:14px; line-height:1.6">
          <strong>${site.sites}</strong> total sites · Season: <strong>${site.season}</strong>
        </p>
      </div>

      ${site.tips ? `<div class="modal-section"><h3>💡 Pro Tip</h3><div class="tip-box">${site.tips}</div></div>` : ""}

      ${reviewsHtml ? `
        <div class="modal-section">
          <h3>💬 What People Are Saying</h3>
          <div class="reviews-list">${reviewsHtml}</div>
        </div>
      ` : ""}

      ${site.alerts.length ? `<div class="modal-section"><h3>⚠️ Alerts</h3>${site.alerts.map((a) => `<div class="alert-tag" style="display:block; margin-bottom:4px">${a}</div>`).join("")}</div>` : ""}

      <button class="modal-add-btn" onclick="addToCart('${site.id}'); closeModal();">
        ${isInCart(site.id) ? "✓ Already in Cart" : "Add to Trip"}
      </button>
    </div>
  `;

  document.getElementById("modalOverlay").classList.add("open");
  document.getElementById("detailModal").classList.add("open");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  document.getElementById("detailModal").classList.remove("open");
}

// --- Cart ---

function addToCart(campsiteId) {
  if (isInCart(campsiteId)) return;

  const today = new Date();
  const nextFriday = new Date(today);
  nextFriday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7 || 7) + 7 * 4);
  const checkout = new Date(nextFriday);
  checkout.setDate(checkout.getDate() + 2);

  cart.push({
    campsiteId,
    checkin: nextFriday.toISOString().split("T")[0],
    checkout: checkout.toISOString().split("T")[0],
    guests: 2,
  });

  updateCartUI();
  loadCampsites();
}

function removeFromCart(campsiteId) {
  const idx = cart.findIndex((item) => item.campsiteId === campsiteId);
  if (idx > -1) cart.splice(idx, 1);
  updateCartUI();
  loadCampsites();
}

function updateCartItem(campsiteId, field, value) {
  const item = cart.find((i) => i.campsiteId === campsiteId);
  if (item) item[field] = field === "guests" ? parseInt(value) || 1 : value;
  updateCartUI();
}

async function updateCartUI() {
  document.getElementById("cartCount").textContent = cart.length;
  const container = document.getElementById("cartItems");
  const footer = document.getElementById("cartFooter");

  if (cart.length === 0) {
    container.innerHTML = '<p class="empty-cart">No campsites added yet.<br>Browse and click "Add to Trip" to get started.</p>';
    footer.style.display = "none";
    return;
  }

  footer.style.display = "block";
  const siteData = await Promise.all(
    cart.map(async (item) => {
      const res = await fetch(`/api/campsites/${item.campsiteId}`);
      return { item, site: await res.json() };
    })
  );

  let totalCost = 0;
  container.innerHTML = siteData.map(({ item, site }) => {
    const nights = Math.ceil((new Date(item.checkout) - new Date(item.checkin)) / 86400000);
    const cost = site.pricePerNight * Math.max(nights, 1) + site.reservationFee;
    totalCost += cost;
    return `
      <div class="cart-item">
        <div class="cart-item-header">
          <span class="cart-item-name">${site.name}</span>
          <button class="cart-item-remove" onclick="removeFromCart('${item.campsiteId}')">Remove</button>
        </div>
        <div class="cart-item-dates">
          <div><label>Check-in</label><input type="date" value="${item.checkin}" onchange="updateCartItem('${item.campsiteId}', 'checkin', this.value)"></div>
          <div><label>Check-out</label><input type="date" value="${item.checkout}" onchange="updateCartItem('${item.campsiteId}', 'checkout', this.value)"></div>
        </div>
        <div class="cart-item-guests">
          <label>Guests</label>
          <input type="number" min="1" max="20" value="${item.guests}" onchange="updateCartItem('${item.campsiteId}', 'guests', this.value)">
        </div>
        <div class="cart-item-cost">$${cost} (${Math.max(nights, 1)} night${nights !== 1 ? "s" : ""} × $${site.pricePerNight}${site.reservationFee ? ` + $${site.reservationFee} fee` : ""})</div>
      </div>
    `;
  }).join("");

  document.getElementById("cartTotal").textContent = `$${totalCost}`;
}

function toggleCart() {
  document.getElementById("cartOverlay").classList.toggle("open");
  document.getElementById("cartSidebar").classList.toggle("open");
  updateCartUI();
}

// --- Checkout ---

async function checkout() {
  if (cart.length === 0) return;
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: cart }),
  });
  const data = await res.json();

  document.getElementById("checkoutContent").innerHTML = `
    <div class="checkout-header">
      <h2>🏕️ Booking Plan</h2>
      <p>${data.bookings.length} site${data.bookings.length > 1 ? "s" : ""} to book — follow the steps for each platform</p>
    </div>
    ${data.bookings.map((b) => `
      <div class="booking-card">
        <div class="booking-card-header">
          <h3>${b.name}</h3>
          <span class="booking-platform">${b.platform}</span>
        </div>
        <div class="booking-details">
          <div class="booking-detail"><label>Check-in</label><span>${formatDate(b.checkin)}</span></div>
          <div class="booking-detail"><label>Check-out</label><span>${formatDate(b.checkout)}</span></div>
          <div class="booking-detail"><label>Nights</label><span>${b.nights}</span></div>
          <div class="booking-detail"><label>Total</label><span>$${b.cost.total}</span></div>
        </div>
        <ol class="booking-steps">${b.instructions.map((s) => `<li>${s}</li>`).join("")}</ol>
        <a class="booking-link" href="${b.bookingUrl}" target="_blank" rel="noopener">Open ${b.platform} →</a>
      </div>
    `).join("")}
    <div class="checkout-total"><span>Estimated Trip Total</span><span>$${data.totalCost}</span></div>
  `;

  toggleCart();
  document.getElementById("checkoutOverlay").classList.add("open");
  document.getElementById("checkoutModal").classList.add("open");
}

function closeCheckout() {
  document.getElementById("checkoutOverlay").classList.remove("open");
  document.getElementById("checkoutModal").classList.remove("open");
}

function formatDate(dateStr) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

init();
