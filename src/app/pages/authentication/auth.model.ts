export type StaffStatus = 'active' | 'inactive';

/** Authenticated user, returned by login and /me. */
export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_id: number;
  role: string;
  office_ids: string[];
  profile_photo: string | null;
  staff_status: StaffStatus;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginData {
  token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
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
