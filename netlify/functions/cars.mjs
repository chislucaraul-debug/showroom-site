// Reads the cars from Airtable and returns them as JSON at /api/cars.
// Field names are matched loosely (ignores capitals, Romanian letters, spaces, brackets),
// so "Preț (€)", "Pret" and "preț" all work.
// Check page: add a DEBUG_KEY variable in Netlify, then open /api/cars?debug=THAT_KEY
//
// Airtable's free plan allows only 1,000 API calls per month, so this connector
// asks Airtable at most about once an hour and serves a saved copy in between.
// Dealer changes therefore appear on the site within about an hour.

const CACHE_MINUTES = 60;
let memo = { at: 0, cars: null };

const COLOR_HEX = {
  "alb": "#E6E8EA", "negru": "#202429", "gri": "#7D848B", "griinchis": "#50555B",
  "argintiu": "#A7ADB3", "albastru": "#2F4C7A", "rosu": "#B3202B", "verde": "#5B6B5A",
  "maro": "#6B4F3A", "bej": "#CDBFA5", "portocaliu": "#C4632C", "galben": "#D9B23A"
};
const norm = s => String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const toNum = v => {
  if (typeof v === "number") return v;
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const toText = v => (Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v)).trim();

async function fetchAll() {
  const base = (process.env.AIRTABLE_BASE_ID || "").trim();
  const table = (process.env.AIRTABLE_TABLE || "Mașini").trim();
  const view = (process.env.AIRTABLE_VIEW || "").trim();
  const records = [];
  let offset;
  do {
    const url = new URL(`https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}`);
    url.searchParams.set("pageSize", "100");
    if (view) url.searchParams.set("view", view);
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${(process.env.AIRTABLE_TOKEN || "").trim()}` } });
    if (!res.ok) throw new Error(`Airtable ${res.status}: ${await res.text()}`);
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

function reader(fields) {
  const map = {};
  for (const k of Object.keys(fields)) map[norm(k)] = fields[k];
  return (...names) => {
    for (const n of names) { const v = map[norm(n)]; if (v !== undefined) return v; }
    return undefined;
  };
}

function toCar(r) {
  const get = reader(r.fields);
  const pics = Array.isArray(get("Poze", "Poza", "Foto", "Fotografii", "Photos", "Imagini")) ? get("Poze", "Poza", "Foto", "Fotografii", "Photos", "Imagini") : [];
  const colorName = toText(get("Culoare"));
  const features = get("Dotări", "Dotari", "Echipamente");
  return {
    id: r.id,
    title: toText(get("Titlu", "Nume", "Model", "Title")),
    brand: toText(get("Marcă", "Marca", "Brand")),
    year: toNum(get("An", "An fabricație", "Anul", "Year")),
    km: toNum(get("Kilometraj", "Km", "Kilometri")) || 0,
    hp: toNum(get("Putere (CP)", "Putere", "CP", "Cai putere")) || 0,
    cc: toNum(get("Capacitate (cm³)", "Capacitate (cm3)", "Capacitate", "Capacitate cilindrică", "cm3")) || 0,
    fuel: toText(get("Combustibil")),
    gearbox: toText(get("Cutie de viteze", "Cutie", "Transmisie")),
    body: toText(get("Caroserie", "Tip")),
    price: toNum(get("Preț (€)", "Preț", "Pret", "Pret (EUR)", "Preț EUR", "Price")),
    oldPrice: toNum(get("Preț vechi (€)", "Preț vechi", "Pret vechi", "Preț inițial", "Pret initial")),
    status: toText(get("Status", "Stare")) || "Disponibil",
    featured: !!get("Recomandat", "Recomandată", "Featured"),
    color: { name: colorName, hex: COLOR_HEX[norm(colorName)] || "#8A9099" },
    euro: toText(get("Normă poluare", "Norma poluare", "Euro")),
    added: r.createdTime.slice(0, 10),
    soldDate: toText(get("Data vânzării", "Data vanzarii")) || null,
    features: Array.isArray(features) ? features : (features ? String(features).split(",").map(s => s.trim()).filter(Boolean) : []),
    description: toText(get("Descriere", "Detalii")),
    photos: pics.map(p => p.url),
    thumbs: pics.map(p => p.thumbnails?.large?.url || p.url)
    // VIN and any other internal fields are never sent to the website.
  };
}

const missing = c => ["title", "year", "price"].filter(k => !c[k]);

export default async (req) => {
  const url = new URL(req.url);
  const key = (process.env.DEBUG_KEY || "").trim();
  const debug = !!key && url.searchParams.get("debug") === key;

  // Ignore made-up query strings so nobody can force extra Airtable calls.
  if (url.search && !debug) return Response.redirect(new URL("/api/cars", url), 301);

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=0, must-revalidate",
    "Netlify-CDN-Cache-Control": `public, durable, max-age=${CACHE_MINUTES * 60}, stale-while-revalidate=600`
  };
  if (!debug && memo.cars && Date.now() - memo.at < (CACHE_MINUTES - 5) * 60000) {
    return new Response(JSON.stringify(memo.cars), { headers });
  }

  try {
    const records = await fetchAll();
    const all = records.map(toCar);
    const cars = all.filter(c => !missing(c).length && norm(c.status) !== "ascuns");

    if (debug) {
      const fieldNames = [...new Set(records.flatMap(r => Object.keys(r.fields)))];
      const report = {
        recordsFromAirtable: records.length,
        carsShownOnSite: cars.length,
        fieldNamesAirtableSent: fieldNames,
        carsSkipped: all.filter(c => missing(c).length || norm(c.status) === "ascuns").map(c => ({
          title: c.title || "(fără titlu)",
          reason: norm(c.status) === "ascuns" ? "Status = Ascuns" : "Lipsește: " + missing(c).map(k => ({ title: "Titlu", year: "An", price: "Preț (€)" }[k])).join(", ")
        }))
      };
      return new Response(JSON.stringify(report, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
    }

    memo = { at: Date.now(), cars };
    return new Response(JSON.stringify(cars), { headers });
  } catch (err) {
    console.error(err);
    if (memo.cars && !debug) return new Response(JSON.stringify(memo.cars), { headers: { ...headers, "Netlify-CDN-Cache-Control": "public, max-age=300" } });
    return new Response(JSON.stringify({ error: "Nu am putut citi stocul din Airtable.", details: debug ? String(err.message) : undefined }), {
      status: 502,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
};

export const config = { path: "/api/cars" };
