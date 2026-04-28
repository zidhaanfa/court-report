export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  meta?: PaginationMeta;
  timestamp: string;
}
