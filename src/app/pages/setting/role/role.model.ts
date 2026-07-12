/** Full role object returned on detail / create / update. */
export interface Role {
  id: number;
  role: string;
  description: string;
  office_id: string | null;
  office_name: string | null;
}

/** Row returned by the paginated list endpoint. */
export interface RoleListRow {
  id: number;
  role: string;
  description: string;
  office_id: string | null;
  office_name: string | null;
}

/** Body for POST / PUT. */
export interface CreateRoleDto {
  role: string;
  description?: string;
  office_id: string;
}

/** Body for partial update. */
export type UpdateRoleDto = Partial<CreateRoleDto>;

export interface RoleListQuery {
  page?: number;
  limit?: number;
  search?: string;
  office_id?: string;
  sort?: 'role' | 'id';
  order?: 'asc' | 'desc';
}

export interface PaginatedRoles {
  data: RoleListRow[];
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
