export type UserRole = 'parent' | 'child';
export type School = 'boles-jhs' | 'moore-elementary-school' | 'martin-hs';
export type SelectionType = 'entree' | 'packed';

export interface Profile {
  id: string;
  auth_user_id: string | null;
  name: string;
  role: UserRole;
  school: School | null;
  pin_hash: string | null;
  avatar_color: string;
  avatar_emoji: string;
  created_at: string;
}

export interface MealSelection {
  id: string;
  profile_id: string;
  date: string;
  selection_type: SelectionType;
  selection_value: string;
  selected_by: string;
  created_at: string;
  updated_at: string;
}

export interface MenuCache {
  id: string;
  school: string;
  week_start_date: string;
  menu_data: WeekMenu;
  fetched_at: string;
}

export interface MenuItem {
  id: number;
  name: string;
  category: string;
  imageUrl?: string;
}

export interface DayMenu {
  date: string;
  entrees: MenuItem[];
  sides: MenuItem[];
}

export interface WeekMenu {
  [date: string]: DayMenu;
}

export interface SessionUser {
  profileId: string;
  name: string;
  role: UserRole;
  school: School | null;
  authType: 'supabase' | 'pin';
}
