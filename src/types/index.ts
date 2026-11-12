export interface QueryParams {
  page?: string | number;
  pageSize?: string | number;
  sort?: string;
  order?: string;
  search?: string;
  [key: string]: string | number | undefined;
}

export interface PaginatedResult<T = Record<string, unknown>> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface JwtPayload {
  sub: string;
  role: 'admin';
  iat?: number;
  exp?: number;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    /** Optional structured payload sent to the client as `details` (e.g. blocking integrity constraints). */
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export interface IntegrityConstraint {
  table: string;
  count: number;
  description: string;
}

export interface IntegrityCheckResult {
  canDelete: boolean;
  constraints: IntegrityConstraint[];
}
