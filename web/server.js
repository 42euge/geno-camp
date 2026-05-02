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
  const { region, minPrice, maxPrice, showerType, siteType, sort, platforms } = _req.query;

  let results = [...campsites];

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
  const regions = [...new Set(campsites.map((c) => c.region))].sort();
  res.json(regions);
});

app.get("/api/platforms", (_req, res) => {
  const platforms = [...new Set(campsites.map((c) => c.platform))].sort();
  res.json(platforms);
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
