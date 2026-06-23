// Shared types across frontend and backend

export type Role = "SUPER_ADMIN" | "TENANT_ADMIN" | "MANAGER" | "VIEWER";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface UserContext {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  role: Role;
}

export type Currency = "USD" | "EUR" | "GBP" | "INR" | "JPY" | "AED";

export interface Money {
  amount: number;
  currency: Currency;
}
