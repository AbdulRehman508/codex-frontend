export type CustomerStatus = 'active' | 'inactive';

/** Full customer object returned on detail / create / update. */
export interface Customer {
  id: string;
  office_id: string;
  first_name: string;
  last_name: string;
  /** optional — walk-in buyers often have none */
  email: string | null;
  mobile_no: string;
  cnic_no: string | null;
  address: string;
  biography?: string;
  profile_photo: string | null;
  borrow_amount: number;
  customer_status: CustomerStatus;
  created_at: string;
  updated_at: string;
}

/** Slim row returned by the list endpoint. */
export interface CustomerListRow {
  id: string;
  full_name: string;
  customer_status: CustomerStatus;
  mobile_no: string;
  email: string | null;
  /** running unpaid balance across borrowed sales */
  borrow_amount: number;
}

/** Body for POST / PUT. */
export interface CreateCustomerDto {
  office_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  mobile_no: string;
  cnic_no?: string | null;
  address?: string;
  biography?: string;
  customer_status?: CustomerStatus;
  /** base64 data URL on input; omit to keep the existing photo on edit. */
  profile_photo?: string | null;
}

/** Body for PATCH (partial). */
export type UpdateCustomerDto = Partial<CreateCustomerDto>;

export interface CustomerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  office_id?: string;
  customer_status?: CustomerStatus;
  sort?:
    | 'first_name'
    | 'email'
    | 'mobile_no'
    | 'customer_status'
    | 'created_at'
    | 'updated_at';
  order?: 'asc' | 'desc';
}

export interface PaginatedCustomers {
  data: CustomerListRow[];
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
