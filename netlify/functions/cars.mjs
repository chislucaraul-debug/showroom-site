// Reads the "Mașini" table from Airtable and returns the cars as JSON at /api/cars.
// The Airtable token stays here on the server; the browser never sees it.

const COLOR_HEX = {
  "alb": "#E6E8EA", "negru": "#202429", "gri": "#7D848B", "gri inchis": "#50555B",
  "argintiu": "#A7ADB3", "albastru": "#2F4C7A", "rosu": "#B3202B", "verde": "#5B6B5A",
  "maro": "#6B4F3A", "bej": "#CDBFA5", "portocaliu": "#C4632C", "galben": "#D9B23A"
};
const plain = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

async function fetchAll() {
  const base = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TABLE || "Mașini";
  const view = process.env.AIRTABLE_VIEW || "Website";
  const records = [];
  let offset;
  do {
    const url = new URL(`https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}`);
    url.searchParams.set("pageSize", "100");
    if (view) url.searchParams.set("view", view);
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` } });
    if (!res.ok) throw new Error(`Airtable ${res.status}: ${await res.text()}`);
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

function toCar(r) {
  const f = r.fields;
  const pics = f["Poze"] || [];
  const colorName = f["Culoare"] || "";
  return {
    id: r.id,
    title: f["Titlu"],
    brand: f["Marcă"] || "",
    year: f["An"],
    km: f["Kilometraj"] || 0,
    hp: f["Putere (CP)"] || 0,
    cc: f["Capacitate (cm³)"] || 0,
    fuel: f["Combustibil"] || "",
    gearbox: f["Cutie de viteze"] || "",
    body: f["Caroserie"] || "",
    price: f["Preț (€)"],
    oldPrice: f["Preț vechi (€)"] || null,
    status: f["Status"] || "Disponibil",
    featured: !!f["Recomandat"],
    color: { name: colorName, hex: COLOR_HEX[plain(colorName)] || "#8A9099" },
    euro: f["Normă poluare"] || "",
    added: r.createdTime.slice(0, 10),
    soldDate: f["Data vânzării"] || null,
    features: f["Dotări"] || [],
    description: f["Descriere"] || "",
    photos: pics.map(p => p.url),
    thumbs: pics.map(p => p.thumbnails?.large?.url || p.url)
    // VIN and any internal fields are deliberately not passed to the website.
  };
}

export default async () => {
  try {
    const cars = (await fetchAll())
      .map(toCar)
      .filter(c => c.title && c.price && c.year && c.status !== "Ascuns");
    return new Response(JSON.stringify(cars), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        // Browsers always ask again; Netlify's CDN keeps a copy for 5 minutes.
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Netlify-CDN-Cache-Control": "public, max-age=300, stale-while-revalidate=300"
      }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Nu am putut citi stocul din Airtable." }), {
      status: 502,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
};

export const config = { path: "/api/cars" };
