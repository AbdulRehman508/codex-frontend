export type MembershipLevel = 'gold' | 'premium' | 'silver';
export type MembershipType = 'monthly' | 'yearly';
export type OfficeStatus = 'active' | 'inactive';

/** An online payment option; printed as a scan-to-pay QR on online bills. */
export interface OfficePaymentMethod {
  /** JazzCash / Easypaisa / Bank Transfer / Raast / ... */
  provider: string;
  account_title: string;
  /** wallet number, IBAN or Raast ID */
  account_number: string;
  /**
   * provider's merchant QR. Stored URL on read; on write a base64 data URL
   * uploads a new one, the stored URL keeps it, null drops it.
   */
  qr_image: string | null;
}

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
  /** head office — only admins may assign staff to it */
  is_main: boolean;
  office_status: OfficeStatus;
  office_address: string;
  biography?: string;
  office_logo: string | null;
  payment_methods: OfficePaymentMethod[];
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
  is_main: boolean;
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
  is_main?: boolean;
  office_status?: OfficeStatus;
  office_address: string;
  biography?: string;
  /** base64 data URL on input; omit/null to keep existing on edit. */
  office_logo?: string | null;
  /** the whole list replaces the stored one */
  payment_methods?: OfficePaymentMethod[];
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
