// Normalizes a phone/dial value into a comparable digit string.
// Handles numbers coming through as Excel floats ("1207777944.0"),
// strings with spaces/dashes, and optional leading zero / country code.
export function normalizePhone(raw) {
  if (raw === null || raw === undefined) return "";
  let s = String(raw).trim();
  // Strip trailing ".0" that Excel adds when a phone column is numeric
  s = s.replace(/\.0+$/, "");
  // Keep digits only
  s = s.replace(/\D/g, "");
  // Strip a leading country code "20" for Egyptian numbers (20xxxxxxxxxx -> xxxxxxxxxx)
  if (s.length === 12 && s.startsWith("20")) {
    s = s.slice(2);
  }
  // Strip a single leading zero (0120... -> 120...)
  if (s.startsWith("0")) {
    s = s.replace(/^0+/, "");
  }
  return s;
}

export function normalizeName(raw) {
  if (raw === null || raw === undefined) return "";
  return String(raw).trim().replace(/\s+/g, " ").toLowerCase();
}

// Builds a phone -> shop_name lookup from Dials rows.
// If the same dial appears more than once with different shops, the first
// occurrence wins and the conflict is recorded.
export function buildDialIndex(dialRows) {
  const index = new Map();
  const conflicts = [];
  for (const row of dialRows) {
    const phone = normalizePhone(row.CUSTOMER_DIAL);
    const shop = (row.shop_name ?? "").toString().trim();
    if (!phone || !shop) continue;
    if (index.has(phone)) {
      if (index.get(phone) !== shop) {
        conflicts.push({ phone, existing: index.get(phone), incoming: shop });
      }
      continue;
    }
    index.set(phone, shop);
  }
  return { index, conflicts };
}

// Builds a shop_name (normalized) -> area manager lookup from Map rows.
export function buildMapIndex(mapRows) {
  const index = new Map();
  for (const row of mapRows) {
    const shop = (row.shop_name ?? "").toString().trim();
    const manager = (row.area_manager ?? "").toString().trim();
    if (!shop || !manager) continue;
    index.set(normalizeName(shop), { manager, shop });
  }
  return index;
}

const UNASSIGNED = "Unassigned";

// Joins Points rows against the Dials index and the Map index, producing
// one output row per point row with resolved shop + area manager (or a
// reason it could not be resolved).
export function joinData(pointRows, dialRows, mapRows, rate) {
  const { index: dialIndex, conflicts } = buildDialIndex(dialRows);
  const mapIndex = buildMapIndex(mapRows);

  const results = [];
  for (const row of pointRows) {
    const phoneRaw = row.Phone ?? row.phone;
    const name = row.Name ?? row.name ?? "";
    const points = Number(row.Points ?? row.points ?? 0) || 0;
    const phone = normalizePhone(phoneRaw);
    const amount = round2(points * (rate / 100));

    const shop = dialIndex.get(phone);
    let manager = null;
    let matchedShop = shop || "";
    let status = "ok";

    if (!shop) {
      status = "no_shop"; // phone not found in Dials sheet
    } else {
      const mapped = mapIndex.get(normalizeName(shop));
      if (mapped) {
        manager = mapped.manager;
        matchedShop = mapped.shop;
      } else {
        status = "no_manager"; // shop found, but not in the Map
      }
    }

    results.push({
      phone: phoneRaw !== undefined ? String(phoneRaw).replace(/\.0+$/, "") : "",
      name,
      points,
      amount,
      shop: matchedShop,
      manager: manager || UNASSIGNED,
      status,
    });
  }

  const byManager = new Map();
  for (const r of results) {
    const key = r.manager;
    if (!byManager.has(key)) byManager.set(key, []);
    byManager.get(key).push(r);
  }

  return { results, byManager, dialConflicts: conflicts };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export { UNASSIGNED };
