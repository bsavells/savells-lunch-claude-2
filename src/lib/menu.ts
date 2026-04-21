import { startOfWeek, format, parseISO, isWeekend } from 'date-fns';
import { NUTRISLICE_BASE, SIDE_CATEGORIES } from './constants';
import { DayMenu, MenuItem, WeekMenu, School } from './types';

export function getMonday(date: Date): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
}

interface NutrisliceItem {
  id: number;
  text: string;
  is_section_title: boolean;
  is_station_header: boolean;
  station_id: number | null;
  serving_size_unit: string | null;
  food: {
    name: string;
    food_category: string;
    image_url?: string;
    image_thumbnail?: string;
  } | null;
  category: string;
}

// Station names that indicate the items underneath are sides
const SIDE_STATION_KEYWORDS = new Set([
  'vegetable', 'vegetables', 'fruit', 'fruits', 'beverage', 'beverages',
  'milk', 'salad', 'salads', 'condiment', 'condiments', 'grain', 'grains',
  'dessert', 'desserts', 'snack', 'snacks', 'juice',
]);

function isSideStation(stationName: string): boolean {
  const lower = stationName.toLowerCase().trim();
  return SIDE_STATION_KEYWORDS.has(lower) ||
    [...SIDE_STATION_KEYWORDS].some((kw) => lower.includes(kw));
}

// Serving units that indicate a side (scoops, small cups) rather than a full entree
const SIDE_SERVING_PATTERNS = /scoop|cup|fl\s*oz|\boz\b|packet/i;

// Name-based rules for items Nutrislice miscategorises or leaves uncategorised
function isSideByName(name: string): boolean {
  const lower = name.toLowerCase().trim();
  // Accompaniments: "w/ Pickles", "with Honey Wheat Biscuit", "w/ Danimals Yogurt"
  if (lower.startsWith('w/') || lower.startsWith('with ')) return true;
  // Generic selectable sides: "Fruit Option", "Vegetable Option"
  if (lower.endsWith(' option')) return true;
  // Nacho/Salad bar toppings listed as separate line items
  if (lower.startsWith('nacho bar') || lower.startsWith('salad bar')) return true;
  // "Or 9" Flour Tortilla" — alternative grain/wrap choice, not an entree
  if (lower.startsWith('or ')) return true;
  return false;
}

interface NutrisliceDay {
  date: string;
  menu_items: NutrisliceItem[];
}

interface NutrisliceResponse {
  start_date: string;
  days: NutrisliceDay[];
}

export async function fetchMenuFromNutrislice(school: School, mondayDate: string): Promise<WeekMenu> {
  const d = parseISO(mondayDate);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  const url = `${NUTRISLICE_BASE}/${school}/menu-type/lunch/${year}/${month}/${day}/`;
  const res = await fetch(url, { next: { revalidate: 600 } });

  if (!res.ok) {
    throw new Error(`Nutrislice API error: ${res.status}`);
  }

  const data: NutrisliceResponse = await res.json();
  const weekMenu: WeekMenu = {};

  for (const day of data.days) {
    const dateStr = day.date;
    const parsed = parseISO(dateStr);
    if (isWeekend(parsed)) continue;

    const entrees: MenuItem[] = [];
    const sides: MenuItem[] = [];

    // Build station id → name map from headers in this day
    const stationNames = new Map<number, string>();
    for (const item of day.menu_items) {
      if (item.is_station_header && item.station_id && item.text) {
        stationNames.set(item.station_id, item.text);
      }
    }

    for (const item of day.menu_items) {
      if (item.is_section_title || item.is_station_header) continue;
      if (!item.food) continue;

      const category = (item.food.food_category || item.category || '').toLowerCase();
      const menuItem: MenuItem = {
        id: item.id,
        name: item.food.name,
        category,
        imageUrl: item.food.image_thumbnail || item.food.image_url || undefined,
      };

      // Layer 1: name-based rules — override Nutrislice mislabelling
      if (isSideByName(menuItem.name)) {
        sides.push(menuItem);
        continue;
      }

      // Layer 2: explicit category from Nutrislice
      if (category && SIDE_CATEGORIES.has(category)) {
        sides.push(menuItem);
        continue;
      }
      if (category === 'entree') {
        entrees.push(menuItem);
        continue;
      }

      // Layer 3: station name (e.g. "Vegetables", "Fruit", "Nacho Bar")
      const stationName = item.station_id ? stationNames.get(item.station_id) ?? '' : '';
      if (stationName && isSideStation(stationName)) {
        sides.push(menuItem);
        continue;
      }

      // Layer 4: serving unit suggests a scooped/poured side
      const servingUnit = item.serving_size_unit ?? '';
      if (servingUnit && SIDE_SERVING_PATTERNS.test(servingUnit)) {
        sides.push(menuItem);
        continue;
      }

      // Default: treat as entree
      entrees.push(menuItem);
    }

    weekMenu[dateStr] = { date: dateStr, entrees, sides };
  }

  return weekMenu;
}
