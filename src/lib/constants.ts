import { School } from './types';

export const SCHOOLS: { slug: School; label: string; short: string }[] = [
  { slug: 'boles-jhs', label: 'Boles Junior High', short: 'Boles' },
  { slug: 'moore-elementary-school', label: 'Moore Elementary School', short: 'Moore' },
];

export const SCHOOL_MAP: Record<School, string> = {
  'boles-jhs': 'Boles Junior High',
  'moore-elementary-school': 'Moore Elementary',
};

export const NUTRISLICE_BASE = 'https://arlingtonisd.api.nutrislice.com/menu/api/weeks/school';

export const MENU_CACHE_HOURS = 24;

export const SIDE_CATEGORIES = new Set([
  'vegetable', 'grain', 'fruit', 'beverage', 'side', 'milk', 'condiment',
]);
