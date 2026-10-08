export type ProductStatus = 'active' | 'inactive';

/** How a product is counted on the shelf. Stock is kept in whole units. */
export type ProductUnit =
  | 'pcs'
  | 'box'
  | 'carton'
  | 'pack'
  | 'dozen'
  | 'kg'
  | 'g'
  | 'litre'
  | 'ml'
  | 'metre'
  | 'foot'
  | 'bag'
  | 'roll'
  | 'set';

export const PRODUCT_UNITS: ProductUnit[] = [
  'pcs',
  'box',
  'carton',
  'pack',
  'dozen',
  'kg',
  'g',
  'litre',
  'ml',
  'metre',
  'foot',
  'bag',
  'roll',
  'set',
];

/**
 * Product joined with its physical location. The API returns the same shape
 * for the list and the detail call, so the edit form can seed the dependent
 * dropdowns straight from `rack_id` / `row_no` / `column_no`.
 */
export interface Product {
  id: string;
  office_id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  /** units currently held in the assigned bin */
  quantity: number;
  /** latest landed cost from a purchase — set by the purchase module, read-only here */
  cost_price: number;
  /** reorder level; 0 = fall back to the office-wide low-stock threshold */
  min_stock: number;
  /** what one unit of `quantity` is called */
  unit: ProductUnit;
  /** units in one supplier pack (carton of 24 => 24) */
  pack_size: number;
  description: string | null;
  status: ProductStatus;
  rack_location_id: string | null;
  rack_id: string | null;
  rack_name: string | null;
  rack_code: string | null;
  row_no: number | null;
  column_no: number | null;
  bin_no: number | null;
  location_code: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Slim row returned by the list endpoint — only the grid's columns. */
export interface ProductListRow {
  id: string;
  name: string;
  price: number;
  quantity: number;
  status: ProductStatus;
}

/** Body for POST / PUT. */
export interface CreateProductDto {
  office_id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  price: number;
  quantity?: number;
  min_stock?: number;
  unit?: ProductUnit;
  pack_size?: number;
  description?: string;
  status?: ProductStatus;
  /** foreign key to a bin; null = unassigned. Never a text location. */
  rack_location_id?: string | null;
}

/** Body for PATCH (partial). */
export type UpdateProductDto = Partial<CreateProductDto>;

export interface ProductListQuery {
  page?: number;
  limit?: number;
  search?: string;
  office_id?: string;
  rack_id?: string;
  status?: ProductStatus;
  /** exact barcode match — what a scanner sends */
  barcode?: string;
  sort?:
    | 'name'
    | 'sku'
    | 'barcode'
    | 'price'
    | 'quantity'
    | 'status'
    | 'created_at'
    | 'updated_at';
  order?: 'asc' | 'desc';
}

export interface PaginatedProducts {
  data: ProductListRow[];
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
