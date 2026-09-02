export type Role = 'admin' | 'receptionist';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  active: boolean;
  created_at: string;
  auth_email?: string;
}

export interface EventRecord {
  id: string;
  name: string;
  venue: string;
  starts_at: string;
  ends_at: string;
  status: string;
  self_checkin_code: string;
  present_count?: number;
}

export interface Attendee {
  id: string;
  event_id: string;
  registration_code: string;
  full_name: string;
  phone: string;
  organisation: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  checkin_method: string | null;
  checked_in_by_name: string | null;
}

export interface Checkin {
  id: string;
  event_id: string;
  attendee_id: string;
  method: string;
  assistant_name: string;
  source_detail: string;
  checked_in_at: string;
  printed_at: string | null;
  attendee?: Pick<Attendee, 'full_name' | 'phone' | 'organisation' | 'registration_code'> | null;
}

export interface CheckinsPage {
  total: number;
  page: number;
  pageSize: number;
  results: Checkin[];
}

export interface Stats {
  total: number;
  present: number;
  pending: number;
  rate: number;
  self: number;
  scanned: number;
  recent: Checkin[];
}
