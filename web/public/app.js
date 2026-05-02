const cart = [];

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

async function loadCampsites() {
  const params = new URLSearchParams({
    region: document.getElementById("regionFilter").value,
    showerType: document.getElementById("showerFilter").value,
    siteType: document.getElementById("siteFilter").value,
    sort: document.getElementById("sortFilter").value,
  });

  const res = await fetch(`/api/campsites?${params}`);
  const sites = await res.json();
  renderGrid(sites);
}

function renderGrid(sites) {
  const grid = document.getElementById("campsiteGrid");
  grid.innerHTML = sites
    .map(
      (site) => `
    <div class="campsite-card" onclick="openDetail('${site.id}')">
      <img class="card-image" src="${site.image}" alt="${site.name}" loading="lazy">
      <div class="card-body">
        <div class="card-region">${site.region}</div>
        <div class="card-name">${site.name}</div>
        <div class="card-location">${site.location} · ${site.driveFromSeattle} from Seattle</div>
        <div class="card-meta">
          <span class="meta-badge badge-rating">★ ${site.rating} (${site.reviews})</span>
          <span class="meta-badge badge-price">$${site.pricePerNight}/night</span>
          <span class="meta-badge badge-shower">🚿 ${site.showers.type === "free" ? "Free" : site.showers.type === "coin-op" ? "Coin-op" : site.showers.type === "token" ? "Token" : "Available"}</span>
          <span class="meta-badge badge-platform">${site.platform}</span>
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
  `
    )
    .join("");
}

function isInCart(id) {
  return cart.some((item) => item.campsiteId === id);
}

async function openDetail(id) {
  const res = await fetch(`/api/campsites/${id}`);
  const site = await res.json();

  document.getElementById("modalContent").innerHTML = `
    <img class="modal-image" src="${site.image}" alt="${site.name}">
    <div class="modal-body">
      <div class="modal-name">${site.name}</div>
      <div class="modal-location">${site.location} · ${site.region} · ${site.driveFromSeattle} from Seattle</div>

      <div class="card-meta" style="margin: 16px 0">
        <span class="meta-badge badge-rating">★ ${site.rating} (${site.reviews} reviews)</span>
        <span class="meta-badge badge-price">$${site.pricePerNight}/night${site.reservationFee ? ` + $${site.reservationFee} fee` : ""}</span>
        <span class="meta-badge badge-platform">${site.platform}</span>
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

  container.innerHTML = siteData
    .map(({ item, site }) => {
      const nights = Math.ceil(
        (new Date(item.checkout) - new Date(item.checkin)) / (1000 * 60 * 60 * 24)
      );
      const cost = site.pricePerNight * Math.max(nights, 1) + site.reservationFee;
      totalCost += cost;

      return `
      <div class="cart-item">
        <div class="cart-item-header">
          <span class="cart-item-name">${site.name}</span>
          <button class="cart-item-remove" onclick="removeFromCart('${item.campsiteId}')">Remove</button>
        </div>
        <div class="cart-item-dates">
          <div>
            <label>Check-in</label>
            <input type="date" value="${item.checkin}" onchange="updateCartItem('${item.campsiteId}', 'checkin', this.value)">
          </div>
          <div>
            <label>Check-out</label>
            <input type="date" value="${item.checkout}" onchange="updateCartItem('${item.campsiteId}', 'checkout', this.value)">
          </div>
        </div>
        <div class="cart-item-guests">
          <label>Guests</label>
          <input type="number" min="1" max="20" value="${item.guests}" onchange="updateCartItem('${item.campsiteId}', 'guests', this.value)">
        </div>
        <div class="cart-item-cost">$${cost} (${Math.max(nights, 1)} night${nights !== 1 ? "s" : ""} × $${site.pricePerNight}${site.reservationFee ? ` + $${site.reservationFee} fee` : ""})</div>
      </div>
    `;
    })
    .join("");

  document.getElementById("cartTotal").textContent = `$${totalCost}`;
}

function toggleCart() {
  document.getElementById("cartOverlay").classList.toggle("open");
  document.getElementById("cartSidebar").classList.toggle("open");
  updateCartUI();
}

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

    ${data.bookings
      .map(
        (b) => `
      <div class="booking-card">
        <div class="booking-card-header">
          <h3>${b.name}</h3>
          <span class="booking-platform">${b.platform}</span>
        </div>
        <div class="booking-details">
          <div class="booking-detail">
            <label>Check-in</label>
            <span>${formatDate(b.checkin)}</span>
          </div>
          <div class="booking-detail">
            <label>Check-out</label>
            <span>${formatDate(b.checkout)}</span>
          </div>
          <div class="booking-detail">
            <label>Nights</label>
            <span>${b.nights}</span>
          </div>
          <div class="booking-detail">
            <label>Total</label>
            <span>$${b.cost.total}</span>
          </div>
        </div>
        <ol class="booking-steps">
          ${b.instructions.map((step) => `<li>${step}</li>`).join("")}
        </ol>
        <a class="booking-link" href="${b.bookingUrl}" target="_blank" rel="noopener">
          Open ${b.platform} →
        </a>
      </div>
    `
      )
      .join("")}

    <div class="checkout-total">
      <span>Estimated Trip Total</span>
      <span>$${data.totalCost}</span>
    </div>
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
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

loadRegions();
loadCampsites();
