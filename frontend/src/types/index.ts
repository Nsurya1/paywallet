export type Theme = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export type WalletStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';

export interface Wallet {
  id: string;
  userId: string;
  currency: string;
  balance: number; // in minor units (paise)
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'TRANSFER_DEBIT' | 'TRANSFER_CREDIT' | 'TOPUP';
export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'FAILED';

export interface Transaction {
  id: string;
  walletId: string;
  relatedWalletId?: string | null;
  type: TransactionType;
  amount: number; // in paise
  balanceAfter: number; // in paise
  reference?: string | null;
  status: TransactionStatus;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
}

export interface TransferRequest {
  fromWalletId: string;
  toWalletId: string;
  amount: number; // in paise
  reference?: string;
}

export interface TransferResponse {
  transferId: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  currency: string;
  reference?: string;
  status: string;
  createdAt: string;
}

export interface TopUpRequest {
  amount: number; // in paise
  paymentGatewayRef?: string;
}

export interface TopUpResponse {
  transactionId: string;
  walletId: string;
  amount: number;
  currency: string;
  newBalance: number;
  status: string;
  createdAt: string;
}

export interface WebhookSubscription {
  id: string;
  targetUrl: string;
  eventType: string;
  secret: string;
  active: boolean;
  createdAt: string;
}

export interface WebhookDeliveryLog {
  id: string;
  subscriptionId: string;
  eventType: string;
  targetUrl: string;
  responseStatus: number;
  responseBody?: string;
  attemptCount: number;
  status: 'SUCCESS' | 'FAILED' | 'RETRYING';
  latencyMs: number;
  createdAt: string;
}
