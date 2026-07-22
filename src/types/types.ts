import { Timestamp, GeoPoint } from "firebase/firestore";

// ============================================================================
// 1. ADMIN USERS (Akses Panel & Kasir)
// ============================================================================
export type AdminRole = "SUPER_ADMIN" | "STAFF" | "admin" | "master" | "manager";

export interface AdminUser {
  uid: string;
  name: string;
  email: string;
  role: AdminRole;
  assignedStoreId: string | null;
  isActive: boolean;
}

// ============================================================================
// 2. USERS (Customer)
// ============================================================================
export type UserTier = "BRONZE" | "SILVER" | "GOLD" | "Silver" | "Gold" | "Platinum";
export type VoucherType = "personal" | "catalog";

export interface UserVoucher {
  id: string;
  code: string;
  title: string;
  rewardId?: string;
  expiresAt?: string;
  expiry?: any;
  isUsed?: boolean;
  type?: VoucherType;
  redeemedAt?: string;
  usedAtStore?: string;
}

export interface XpHistoryEntry {
  id: string;
  date?: string;
  createdAt?: any;
  amount: number;
  type: "earn" | "redeem";
  status?: "pending" | "verified" | "rejected";
  context?: string;
  location?: string;
  transactionId?: string;
}

export interface RewardItem {
  id: string;
  title: string;
  description?: string;
  pointsCost?: number;
  image?: string;
  imageURL?: string;
  category?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  isRedeemable?: boolean;
  stock?: number;
  updatedAt?: any;
}

export interface UserProfile {
  uid: string; 
  name: string;
  phone?: string;
  phoneNumber?: string;
  email?: string; 
  photoURL?: string; 
  points?: number;
  currentPoints?: number;
  pendingPoints?: number;
  lifetimePoints?: number;
  tierXp?: number;
  xp?: number;
  tier: UserTier;
  joinedDate?: string;
  xpHistory?: XpHistoryEntry[];
  vouchers?: UserVoucher[]; 
  activeVouchers?: UserVoucher[];
  role?: string; 
  profileComplete?: boolean;
  emailVerified?: boolean;
}

// ============================================================================
// 3. NOTIFICATIONS (Sub-Collection)
// ============================================================================
export type NotificationType = "voucher_injected" | "tx_verified" | "tx_rejected" | "points_pending" | "broadcast" | "targeted" | "system";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: any; 
  data?: Record<string, unknown>;
  imageURL?: string;
}

// ============================================================================
// 4. TRANSACTIONS
// ============================================================================
export type TransactionStatus = "PENDING" | "COMPLETED" | "CANCELLED" | "REFUNDED";

export interface TransactionRecord {
  id?: string;
  uid?: string | null;
  receiptNumber: string;
  storeId: string;
  storeName: string;
  userId: string | null;
  totalAmount: number;
  status: TransactionStatus;
  createdAt: any;
  memberId?: string;      
  memberName?: string;    
  staffId?: string;       
  transactionId?: string;
  amount?: number;
  storeLocation?: string;
  pointsEarned?: number;
  potentialPoints?: number;
  type?: "earn" | "redeem";
  verifiedAt?: any;
  verifiedBy?: string;
  voucherCode?: string; 
  voucherTitle?: string; 
}
