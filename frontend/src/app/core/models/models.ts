export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: UserDto;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'demo';
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'demo';
  isActive: boolean;
  createdAt: string;
}

export interface Movement {
  id: string;
  title: string;
  description?: string;
  type: 'receita' | 'divida' | 'promessa_pagamento' | 'promessa_recebimento';
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  expenseDate: string;
  dueDate?: string | null;
  sourceFile?: string;
  movementId?: string | null;
  movementTitle?: string;
  movementType?: string;
  createdAt: string;
}

export interface Summary {
  totalReceitas: number;
  totalDividas: number;
  saldo: number;
  byMovement: MovementSummary[];
  promises: PromiseExpense[];
}

export interface MovementSummary {
  movementId: string;
  title: string;
  type: string;
  total: number;
}

export interface PromiseExpense {
  expenseId: string;
  movementId?: string | null;
  title: string;
  amount: number;
  expenseDate: string;
  dueDate: string;
  promiseType: 'promessa_pagamento' | 'promessa_recebimento';
  movementTitle?: string;
  isOverdue: boolean;
  daysOverdue: number;
}

export interface ExtractedExpenseItem {
  title: string;
  amount: number;
  date: string;
}

export interface PdfExtractResponse {
  items: ExtractedExpenseItem[];
  count: number;
}
