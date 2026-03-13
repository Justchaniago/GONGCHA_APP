
import { Timestamp, GeoPoint, DocumentData, FirestoreDataConverter, QueryDocumentSnapshot, SnapshotOptions, PartialWithFieldValue } from "firebase/firestore";

// ============================================================================
// 1. ADMIN USERS (Akses Panel & Kasir) - Collection: 'admin_users'
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
// 2. USERS & NOTIFICATIONS (Ekosistem Customer) - Collection: 'users'
// ============================================================================
export type UserTier = "BRONZE" | "SILVER" | "GOLD" | "Silver" | "Gold" | "Platinum";
export type UserRole = "member" | "admin";
export type StaffRole = "cashier" | "store_manager" | "admin";

export interface Staff {
  uid: string;
  name: string;
  email?: string;
  role: StaffRole;
  storeLocations?: string[];
  accessAllStores?: boolean;
  isActive?: boolean;
}

export type VoucherType = "personal" | "catalog";

export interface UserVoucher {
  id: string;
  code: string;
  title: string;
  expiry: Timestamp;
  rewardId?: string;
  expiresAt?: string;
  isUsed?: boolean;
  type?: VoucherType;
}

export interface User {
  uid: string;
  name: string;
  phone?: string;
  dob?: string; // YYYY-MM-DD
  points?: number;
  xp?: number;
  tier: UserTier;
  activeVouchers?: UserVoucher[];
  fcmTokens?: string[];
  email?: string;
  phoneNumber?: string;
  role?: UserRole | string;
  currentPoints?: number;
  lifetimePoints?: number;
  joinedDate?: string;
  vouchers?: UserVoucher[];
  xpHistory?: any[];
  photoURL?: string;
}

export type NotificationType = "voucher_injected" | "tx_verified" | "tx_rejected" | "broadcast" | "targeted";

export interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Timestamp;
  expireAt: Timestamp;
}

export interface UserNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface AdminNotificationLog {
  type: NotificationType;
  title: string;
  body: string;
  targetType: "all" | "user";
  targetUid?: string;
  targetName?: string;
  sentAt: string;
  sentBy: string;
  recipientCount: number;
}

// ============================================================================
// 3. MASTER DATA (Stores & Products) - Collection: 'stores', 'products'
// ============================================================================
export interface Store {
  id: string;
  name: string;
  address: string;
  location: GeoPoint;
  operationalHours: { open: string; close: string };
  isForceClosed: boolean;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  imageUrl: string;
  isLargeAvailable: boolean;
  isHotAvailable: boolean;
  isAvailable: boolean;
}

// ============================================================================
// 4. TRANSACTIONS - Collection: 'transactions'
// ============================================================================
export type TransactionStatus = "PENDING" | "COMPLETED" | "CANCELLED" | "REFUNDED";

export interface Transaction {
  id: string;
  receiptNumber: string;
  storeId: string;
  storeName: string;
  userId: string | null;
  totalAmount: number;
  status: TransactionStatus;
  createdAt: Timestamp;
  // Additional fields for loyalty program
  memberId?: string;
  memberName?: string;
  staffId?: string;
  potentialPoints?: number;
  type?: "earn" | "redeem";
  verifiedAt?: Timestamp;
  verifiedBy?: string;
}

// ============================================================================
// 5. DAILY STATS (The God Document) - Collection: 'daily_stats'
// ============================================================================
export interface DailyStat {
  id: string;
  date: string;
  type: "GLOBAL" | "STORE";
  storeId: string;
  totalRevenue: number;
  totalTransactions: number;
  updatedAt: Timestamp;
}

// ============================================================================
// 6. MARKETING (Rewards & Promos) - Collection: 'rewards', 'global_promos'
// ============================================================================
export interface Reward {
  id: string;
  title: string;
  description: string;
  pointsrequired: number;
  imageUrl: string;
  isActive: boolean;
}

export interface GlobalPromo {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
}

// ============================================================================
// 7. LEGACY ADMIN ACCOUNTS (compatibility layer)
// ============================================================================
export type AccountRole = "master" | "admin" | "manager" | "viewer";
export type AccountStatus = "active" | "suspended" | "pending";

export interface Account {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: AccountRole;
  status: AccountStatus;
  notes?: string;
  createdAt?: string;
  lastLogin?: string;
}

// Legacy alias used by old menus page
export type ProductItem = Product;