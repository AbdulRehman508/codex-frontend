export type StaffStatus = 'active' | 'inactive';

/** Current-user profile returned by GET /profile and PUT /profile. */
export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_no: string;
  cnic_no: string;
  office_ids: string[];
  offices: string[];
  role_id: number;
  role: string | null;
  address: string;
  biography: string | null;
  profile_photo: string | null;
  staff_status: StaffStatus;
  created_at?: string;
  updated_at?: string;
}

/** Editable fields only (PUT body). */
export interface UpdateProfileDto {
  first_name: string;
  last_name: string;
  mobile_no: string;
  cnic_no: string;
  address: string;
  biography?: string;
  /** base64 data URL on input; omit/null to keep existing. */
  profile_photo?: string | null;
}

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}
