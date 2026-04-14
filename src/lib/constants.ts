import { School } from './types';

export const SCHOOLS: { slug: School; label: string; short: string }[] = [
  { slug: 'moore-elementary-school', label: 'Moore Elementary School', short: 'Moore' },
  { slug: 'boles-jhs', label: 'Boles Junior High', short: 'Boles JHS' },
  { slug: 'martin-hs', label: 'Martin High School', short: 'Martin HS' },
];

export const SCHOOL_MAP: Record<School, string> = {
  'boles-jhs': 'Boles Junior High',
  'moore-elementary-school': 'Moore Elementary',
  'martin-hs': 'Martin High School',
};

export const NUTRISLICE_BASE = 'https://arlingtonisd.api.nutrislice.com/menu/api/weeks/school';

export const MENU_CACHE_HOURS = 24;

export const SIDE_CATEGORIES = new Set([
  'vegetable', 'grain', 'fruit', 'beverage', 'side', 'milk', 'condiment',
]);

// Oldest to youngest
export const KID_ORDER = ['Patrick', 'Bridget', 'Michael', 'Blaise', 'Leo', 'George'] as const;

export function sortKidsByAge<T extends { name: string }>(kids: T[]): T[] {
  return [...kids].sort(
    (a, b) => KID_ORDER.indexOf(a.name as typeof KID_ORDER[number]) -
              KID_ORDER.indexOf(b.name as typeof KID_ORDER[number])
  );
}
