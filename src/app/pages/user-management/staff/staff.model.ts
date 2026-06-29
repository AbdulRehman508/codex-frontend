export type StaffStatus = 'active' | 'inactive';

/** Full staff object returned on detail / create / update. */
export interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_no: string;
  cnic_no: string;
  office_ids: string[];
  role_id: number;
  address: string;
  salary: number;
  biography?: string;
  profile_photo: string | null;
  staff_status: StaffStatus;
  created_at: string;
  updated_at: string;
}

/** Slim row returned by the list endpoint (5 fields only). */
export interface StaffListRow {
  id: string;
  full_name: string;
  staff_status: StaffStatus;
  mobile_no: string;
  email: string;
}

/** Body for POST / PUT. */
export interface CreateStaffDto {
  first_name: string;
  last_name: string;
  email: string;
  /** required on create; omit/empty on edit to keep existing. */
  password?: string;
  mobile_no: string;
  cnic_no: string;
  office_ids: string[];
  role_id: number;
  address: string;
  salary: number;
  biography?: string;
  /** base64 data URL on input; omit/null to keep existing on edit. */
  profile_photo?: string | null;
  staff_status?: StaffStatus;
}

/** Body for PATCH (partial). */
export type UpdateStaffDto = Partial<CreateStaffDto>;

export interface StaffListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role_id?: number;
  sort?: 'first_name' | 'email' | 'mobile_no' | 'staff_status' | 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
}

export interface PaginatedStaff {
  data: StaffListRow[];
  total: number;
  page: number;
  limit: number;
}

/** Standard response envelope. */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}
