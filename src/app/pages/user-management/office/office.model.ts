export type MembershipLevel = 'gold' | 'premium' | 'silver';
export type MembershipType = 'monthly' | 'yearly';
export type OfficeStatus = 'active' | 'inactive';

/** Full office object returned on detail / create / update. */
export interface Office {
  id: string;
  office_name: string;
  office_email: string;
  office_mobile_no: string;
  membership_level: MembershipLevel;
  membership_type: MembershipType;
  licence_no?: string;
  approved: boolean;
  office_status: OfficeStatus;
  office_address: string;
  biography?: string;
  office_logo: string | null;
  created_at: string;
  updated_at: string;
}

/** Slim row returned by the list endpoint (5 fields only). */
export interface OfficeListRow {
  id: string;
  office_name: string;
  office_status: OfficeStatus;
  office_mobile_no: string;
  office_email: string;
}

/** Body for POST / PUT. */
export interface CreateOfficeDto {
  office_name: string;
  office_email: string;
  office_mobile_no: string;
  membership_level: MembershipLevel;
  membership_type: MembershipType;
  licence_no?: string;
  approved?: boolean;
  office_status?: OfficeStatus;
  office_address: string;
  biography?: string;
  /** base64 data URL on input; omit/null to keep existing on edit. */
  office_logo?: string | null;
}

/** Body for PATCH (partial). */
export type UpdateOfficeDto = Partial<CreateOfficeDto>;

export interface OfficeListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: 'office_name' | 'office_email' | 'office_mobile_no' | 'office_status' | 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
}

export interface PaginatedOffices {
  data: OfficeListRow[];
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
