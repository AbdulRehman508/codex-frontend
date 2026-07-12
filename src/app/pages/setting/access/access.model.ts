/** One row of the permission matrix (module + its CRUD flags). */
export interface AccessPermission {
  /** stable catalog key, e.g. 'dashboard' */
  module: string;
  /** display label, e.g. 'Dashboard' */
  module_label: string;
  /** section header, e.g. 'User Management'; null for top-level modules */
  module_group: string | null;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

/** Full matrix for a role. office info is flattened from the role. */
export interface RoleAccess {
  role_id: number;
  role: string;
  office_id: string | null;
  office_name: string | null;
  permissions: AccessPermission[];
}

/** Payload row sent on save (label is server-derived, so omitted). */
export interface SavePermission {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

/** Standard response envelope. */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}
