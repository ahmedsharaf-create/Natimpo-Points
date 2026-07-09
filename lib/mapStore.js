import seedData from "./mapSeedData.json";

const KEY = "natimpo_points_map_v1";

// First run in a browser: seed with the shop/manager map shipped with the
// app so the tool is usable immediately. Once the user saves anything
// (including an intentional "clear all"), their own data takes over.
export function loadMap() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seedData;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedData;
    return parsed;
  } catch {
    return seedData;
  }
}

export function saveMap(rows) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(rows));
}

export function clearMap() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
