export type RackStatus = 'active' | 'inactive';

/** A rack. Its physical slots live in `locations` (one row per bin). */
export interface Rack {
  id: string;
  office_id: string;
  name: string;
  code: string;
  description?: string | null;
  status: RackStatus;
  rows_count: number;
  columns_count: number;
  bins_count: number;
  created_at: string;
  updated_at: string;
}

/** One generated bin: rack -> row -> column -> bin. */
export interface RackLocationBin {
  id: string;
  rack_id: string;
  row_no: number;
  column_no: number;
  bin_no: number;
  location_code: string;
  status: RackStatus;
  /** a product is already stored here */
  occupied: boolean;
}

/** Detail response: the rack plus every bin it generated. */
export interface RackDetail extends Rack {
  locations_count: number;
  locations: RackLocationBin[];
}

/** Row returned by the list endpoint. */
export interface RackListRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: RackStatus;
  rows_count: number;
  columns_count: number;
  bins_count: number;
  locations_count: number;
}

/** Body for POST / PUT. */
export interface CreateRackDto {
  office_id: string;
  name: string;
  code: string;
  description?: string;
  status?: RackStatus;
  rows_count: number;
  columns_count: number;
  bins_count: number;
}

/** Body for PATCH (partial). */
export type UpdateRackDto = Partial<CreateRackDto>;

export interface RackListQuery {
  page?: number;
  limit?: number;
  search?: string;
  office_id?: string;
  status?: RackStatus;
  sort?:
    | 'name'
    | 'code'
    | 'status'
    | 'rows_count'
    | 'columns_count'
    | 'bins_count'
    | 'created_at'
    | 'updated_at';
  order?: 'asc' | 'desc';
}

export interface PaginatedRacks {
  data: RackListRow[];
  total: number;
  page: number;
  limit: number;
}

/** Options for the dependent dropdowns on the product form. */
export interface RowOption {
  row_no: number;
  label: string;
}

export interface ColumnOption {
  column_no: number;
  label: string;
}

/** Max bins a single rack may generate (mirrors the API guard rail). */
export const MAX_GENERATED_LOCATIONS = 5000;

/** RACK-A + (1,2,3) -> RACK-A-R1-C2-B3 — same rule the API applies. */
export function buildLocationCode(
  rackCode: string,
  row: number,
  column: number,
  bin: number,
): string {
  return `${(rackCode || '').toUpperCase()}-R${row}-C${column}-B${bin}`;
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
