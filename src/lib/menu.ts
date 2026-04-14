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
  food: {
    name: string;
    food_category: string;
    image_url?: string;
    image_thumbnail?: string;
  } | null;
  category: string;
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
  const res = await fetch(url, { next: { revalidate: 3600 } });

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

    for (const item of day.menu_items) {
      if (item.is_section_title || item.is_station_header) continue;
      if (!item.food) continue;

      const category = (item.food.food_category || item.category || 'other').toLowerCase();
      const menuItem: MenuItem = {
        id: item.id,
        name: item.food.name,
        category,
        imageUrl: item.food.image_thumbnail || item.food.image_url || undefined,
      };

      if (SIDE_CATEGORIES.has(category)) {
        sides.push(menuItem);
      } else {
        entrees.push(menuItem);
      }
    }

    weekMenu[dateStr] = { date: dateStr, entrees, sides };
  }

  return weekMenu;
}
