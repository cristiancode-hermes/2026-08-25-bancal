export const TOKEN_KEY = 'bancal.jwt';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'visitor' | 'staff' | 'admin';
  points: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Crop {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  pricePerKg: number;
  ripeMonths: number[];
  dailyKg: number;
  photoUrl: string | null;
  isActive: boolean;
  isRipeToday: boolean;
  remainingKgToday: number;
  plots?: Plot[];
  reviews?: { avg: number; items: Review[] };
}

export interface Plot {
  id: string;
  name: string;
  exposure: string;
  notes: string | null;
  crops?: Crop[];
}

export interface HarvestWindow {
  id: string;
  fieldDayId: string;
  startTime: string;
  endTime: string;
  capacity: number;
  reservedCount: number;
  date: string;
  freeSlots: number;
  label: string;
  statusLabel: string;
  passed: boolean;
}

export interface FieldDay {
  id: string;
  date: string;
  status: 'open' | 'limited' | 'closed';
  note: string | null;
  maxVisitors: number;
  windows?: HarvestWindow[];
}

export interface Addon {
  id: string;
  name: string;
  price: number;
}

export interface BookingLine {
  id: string;
  cropId: string;
  estimatedKg: number;
  actualKg: number | null;
  unitPrice: number;
  amount: number;
  crop?: Crop;
}

export interface CrateEntry {
  id: string;
  cropId: string;
  kg: number;
  crop?: Crop;
}

export interface BookingAddon {
  addonId: string;
  qty: number;
  addon?: Addon;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
}

export interface Booking {
  id: string;
  userId: string;
  fieldDayId: string;
  windowId: string;
  partySize: number;
  status: string;
  statusLabel: string;
  code: string;
  expiresAt: string | null;
  qrSvg: string | null;
  qrUrl: string | null;
  total: number;
  lines: BookingLine[];
  crate: CrateEntry[];
  addons: BookingAddon[];
  window?: HarvestWindow;
  fieldDay?: FieldDay;
  review?: Review | null;
  createdAt: string;
}

export interface ConfirmResult {
  booking: Booking;
  qrSvg: string;
  qrUrl: string;
}

export const MONTHS = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
