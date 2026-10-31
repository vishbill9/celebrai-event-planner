export interface Plan {
  summary: string;
  theme: string;
  surprise_idea: string;
  timeline: { time: string; activity: string }[];
  checklist: { task: string; when: string }[];
  budget_breakdown: { category: string; amount: number }[];
  tips: string[];
}

export interface Creative {
  tagline: string;
  palette: string[];
  decor: string[];
  menu: { course: string; idea: string }[];
  playlist_vibes: string[];
  activities: string[];
  photo_booth: string[];
  hashtag: string;
  dress_code: string;
  welcome_drink: string;
  return_gifts: string[];
}

export interface EventItem {
  id: string;
  title: string;
  eventType: string;
  eventDate: string | null;
  location: string;
  guestCount: number;
  budgetTotal: number;
  description: string;
  aiPlan: Plan | null;
  aiCreative: Creative | null;
  createdAt: string;
  updatedAt: string;
  guestsInvited?: number;
  budgetItems?: number;
}

export type Rsvp = 'pending' | 'yes' | 'no' | 'maybe';

export interface Guest {
  id: string;
  eventId: string;
  name: string;
  email: string;
  rsvp: Rsvp;
  plusOnes: number;
  notes: string;
}

export interface BudgetItem {
  id: string;
  eventId: string;
  category: string;
  description: string;
  estimated: number;
  actual: number;
  paid: boolean;
}

export type EventInput = Pick<EventItem, 'title' | 'eventType' | 'eventDate' | 'location' | 'guestCount' | 'budgetTotal' | 'description'>;
