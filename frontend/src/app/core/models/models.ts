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
  role: 'admin' | 'user';
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
}

export interface Movement {
  id: string;
  title: string;
  description?: string;
  type: 'receita' | 'divida';
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  expenseDate: string;
  sourceFile?: string;
  movementId?: string;
  movementTitle?: string;
  movementType?: string;
  createdAt: string;
}

export interface Summary {
  totalReceitas: number;
  totalDividas: number;
  saldo: number;
  byMovement: MovementSummary[];
}

export interface MovementSummary {
  movementId: string;
  title: string;
  type: string;
  total: number;
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
