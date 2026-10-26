export type StockRequestStatus = 'pending' | 'approved' | 'declined' | 'cancelled';

/** Which side of the conversation a list is about. */
export type RequestDirection = 'incoming' | 'outgoing';

export interface RequestLine {
  product_id: string;
  name: string;
  sku: string;
  quantity: number;
  /** what the holding branch had when the request was written */
  available_at_request: number;
}

export interface StockRequest {
  id: string;
  request_no: string;
  requesting_office_id: string;
  source_office_id: string;
  requesting_office_name: string;
  source_office_name: string;
  lines: RequestLine[];
  items_count: number;
  units: number;
  status: StockRequestStatus;
  note: string;
  decline_reason: string;
  transfer_id: string | null;
  reviewed_at: string | null;
  created_at?: string;
}

/** Slim row for the grid. */
export interface RequestRow {
  id: string;
  request_no: string;
  requesting_office_id: string;
  source_office_id: string;
  requesting_office_name: string;
  source_office_name: string;
  items_count: number;
  units: number;
  status: StockRequestStatus;
  note: string;
  decline_reason: string;
  transfer_id: string | null;
  reviewed_at: string | null;
  created_at: string | null;
}

export interface RequestSummary {
  requests: number;
  units: number;
  /** waiting on us to answer */
  pending_incoming: number;
  /** waiting on another branch to answer us */
  pending_outgoing: number;
}

export interface RequestListQuery {
  page?: number;
  limit?: number;
  office_id?: string;
  direction?: RequestDirection;
  status?: StockRequestStatus;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedRequests {
  data: RequestRow[];
  total: number;
  page: number;
  limit: number;
  summary: RequestSummary;
}

export interface CreateRequestDto {
  /** the branch that needs the stock */
  office_id: string;
  /** the branch being asked */
  source_office_id: string;
  lines: { product_id: string; quantity: number }[];
  note?: string;
}

/** A product the other branch has on the shelf. */
export interface AvailableProduct {
  product_id: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
}

/** Standard response envelope. */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}
