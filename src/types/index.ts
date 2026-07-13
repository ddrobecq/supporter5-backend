export interface QueryParams {
  page?: string | number;
  limit?: string | number;
  sort?: string;
  order?: string;
  search?: string;
  [key: string]: string | number | undefined;
}

export interface PaginatedResult<T = Record<string, unknown>> {
  data: T[];
  total: number;
  page: number;
  limit: number;
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
  ) {
    super(message);
    this.name = 'AppError';
  }
}
