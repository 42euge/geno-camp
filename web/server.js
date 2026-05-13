import express from "express";
import { campsites } from "./campsites.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3456;

app.use(express.json());
app.use(express.static(join(__dirname, "public")));

app.get("/api/campsites", (_req, res) => {
  const { region, minPrice, maxPrice, showerType, siteType, sort, platforms, q, state } = _req.query;

  let results = [...campsites];

  if (q) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    results = results.filter((c) => {
      const haystack = [c.name, c.location, c.region, c.highlights, c.platform, ...c.amenities, ...(c.tips ? [c.tips] : [])].join(" ").toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }
  if (state && state !== "all") {
    results = results.filter((c) => c.location.endsWith(`, ${state}`));
  }
  if (region && region !== "all") {
    results = results.filter((c) => c.region === region);
  }
  if (minPrice) {
    results = results.filter((c) => c.pricePerNight >= Number(minPrice));
  }
  if (maxPrice) {
    results = results.filter((c) => c.pricePerNight <= Number(maxPrice));
  }
  if (showerType && showerType !== "all") {
    results = results.filter((c) => c.showers.type === showerType);
  }
  if (siteType && siteType !== "all") {
    results = results.filter((c) => c.siteTypes.includes(siteType));
  }
  if (platforms) {
    const allowed = platforms.split(",").filter(Boolean);
    if (allowed.length > 0) {
      results = results.filter((c) => allowed.includes(c.platform));
    }
  }
  if (sort === "price") {
    results.sort((a, b) => a.pricePerNight - b.pricePerNight);
  } else if (sort === "rating") {
    results.sort((a, b) => b.rating - a.rating);
  } else if (sort === "reviews") {
    results.sort((a, b) => b.reviews - a.reviews);
  } else if (sort?.startsWith("distance-")) {
    const cityKey = sort.replace("distance-", "");
    const city = CITIES[cityKey];
    if (city) {
      results = results.map((c) => ({ ...c, distanceMi: Math.round(haversine(city.lat, city.lng, c.lat, c.lng)) }));
      results.sort((a, b) => a.distanceMi - b.distanceMi);
    }
  }

  res.json(results);
});

app.get("/api/campsites/:id", (req, res) => {
  const site = campsites.find((c) => c.id === req.params.id);
  if (!site) return res.status(404).json({ error: "Not found" });
  res.json(site);
});

app.get("/api/campsites/:id/availability", (req, res) => {
  const site = campsites.find((c) => c.id === req.params.id);
  if (!site) return res.status(404).json({ error: "Not found" });
  res.json(site.availability || {});
});

app.get("/api/regions", (_req, res) => {
  let filtered = campsites;
  if (_req.query.state && _req.query.state !== "all") {
    filtered = campsites.filter((c) => c.location.endsWith(`, ${_req.query.state}`));
  }
  const regions = [...new Set(filtered.map((c) => c.region))].sort();
  res.json(regions);
});

app.get("/api/platforms", (_req, res) => {
  const platforms = [...new Set(campsites.map((c) => c.platform))].sort();
  res.json(platforms);
});

const CITIES = {
  seattle: { lat: 47.6062, lng: -122.3321 },
  portland: { lat: 45.5152, lng: -122.6784 },
  bend: { lat: 44.0582, lng: -121.3153 },
};

function haversine(lat1, lng1, lat2, lng2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

app.get("/api/campsites/:id/nearby", (req, res) => {
  const site = campsites.find((c) => c.id === req.params.id);
  if (!site) return res.status(404).json({ error: "Not found" });

  const nearby = campsites
    .filter((c) => c.id !== site.id)
    .map((c) => ({ ...c, distance: Math.round(haversine(site.lat, site.lng, c.lat, c.lng)) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 4);

  res.json(nearby);
});

app.get("/api/cities", (_req, res) => {
  res.json(Object.keys(CITIES));
});

app.post("/api/checkout", (req, res) => {
  const { items } = req.body;
  if (!items?.length) return res.status(400).json({ error: "Cart is empty" });

  const results = items.map((item) => {
    const site = campsites.find((c) => c.id === item.campsiteId);
    if (!site) return { campsiteId: item.campsiteId, status: "error", message: "Campsite not found" };

    const nights = Math.ceil(
      (new Date(item.checkout) - new Date(item.checkin)) / (1000 * 60 * 60 * 24)
    );
    const total = site.pricePerNight * nights + site.reservationFee;

    return {
      campsiteId: site.id,
      name: site.name,
      platform: site.platform,
      bookingUrl: site.bookingUrl,
      status: "ready",
      checkin: item.checkin,
      checkout: item.checkout,
      nights,
      guests: item.guests,
      cost: { perNight: site.pricePerNight, nights, reservationFee: site.reservationFee, total },
      instructions: getBookingInstructions(site),
    };
  });

  res.json({ bookings: results, totalCost: results.reduce((s, r) => s + (r.cost?.total || 0), 0) });
});

function getBookingInstructions(site) {
  if (site.platform === "WA State Parks") {
    return [
      "Go to washington.goingtocamp.com",
      `Search for "${site.name}"`,
      "Select your dates and equipment type",
      "Pick a site from the map (check proximity to showers)",
      "Add to cart and fill in camper details",
      "Pay with credit card ($8 reservation fee added)",
      "Tip: Have backup dates ready — session times out quickly",
    ];
  }
  if (site.platform === "OR State Parks") {
    return [
      "Go to oregonstateparks.reserveamerica.com",
      `Search for "${site.name}"`,
      "Select your dates and view available sites",
      "Pick a specific site from the map view",
      "Fill in group size and equipment details",
      "Create account or sign in → pay ($8 reservation fee added)",
      "Tip: Coastal parks sell out fast for summer weekends — book 9 months ahead",
    ];
  }
  if (site.platform === "Hipcamp") {
    return [
      `Go to ${site.bookingUrl}`,
      `Search for "${site.name}"`,
      "Select dates → click Reserve",
      "Read the Rulebook → Agree and Continue",
      "Add any extras (firewood, kayaks, etc.)",
      "Enter vehicle count and camping setup",
      "Pay with credit card (10-15% service fee on top)",
      "Note: Some hosts use Request-to-Book — wait up to 24h for confirmation",
    ];
  }
  if (site.platform === "Recreation.gov") {
    return [
      `Go to ${site.bookingUrl}`,
      "Click 'Check Availability'",
      "Select your dates on the calendar (green = available)",
      "Pick a specific site from the map view",
      "Click 'Book Now' → sign in or create an account",
      "Fill in details and pay ($6 non-refundable reservation fee)",
      "⚡ 15-minute checkout timer — have payment info ready",
      "Tip: New dates release on the 15th of each month at 10am ET",
    ];
  }
  return ["Visit the booking URL and follow the platform instructions"];
}

app.listen(PORT, () => {
  console.log(`\n  🏕️  geno-camp running at http://localhost:${PORT}\n`);
});
