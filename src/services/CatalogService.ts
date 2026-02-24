import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { firestoreDb } from '../config/firebase';
import { RewardItem } from '../types/types';

// Firebase document shape (raw from Firestore)
type FirebaseRewardDoc = {
  id: string;
  title?: string;
  description?: string;
  pointsCost?: number;
  imageURL?: string;   // Firebase uses imageURL, not image
  image?: string;      // fallback if already mapped
  category?: string;
  isActive?: boolean;
  stock?: number;
};

// Map Firebase doc → RewardItem (handles field name differences)
const mapDocToRewardItem = (doc: any): RewardItem => {
  const data = doc.data() as FirebaseRewardDoc;
  console.log(`[CatalogService] Raw doc ${doc.id}:`, data);

  return {
    ...data,
    id: doc.id,
    // Firebase stores as imageURL, normalize to image
    image: data.image ?? data.imageURL ?? '',
  } as RewardItem;
};

export const CatalogService = {
  // Fetch from rewards_catalog (primary collection seen in Firebase)
  async getCatalog(): Promise<RewardItem[]> {
    console.log('[CatalogService] Fetching rewards_catalog...');
    const catalogRef = collection(firestoreDb, 'rewards_catalog');
    const snapshot = await getDocs(catalogRef);
    console.log(`[CatalogService] rewards_catalog: ${snapshot.docs.length} docs found`);

    const items = snapshot.docs.map(mapDocToRewardItem);
    console.log('[CatalogService] Mapped catalog items:', items);
    return items;
  },

  // Get active rewards from rewards_catalog
  async getAvailableVouchers(): Promise<RewardItem[]> {
    console.log('[CatalogService] Fetching available rewards...');
    const catalogRef = collection(firestoreDb, 'rewards_catalog');
    const snapshot = await getDocs(catalogRef);
    console.log(`[CatalogService] Total docs: ${snapshot.docs.length}`);

    const allItems = snapshot.docs.map(mapDocToRewardItem) as (RewardItem & {
      isActive?: boolean;
      stock?: number;
    })[];

    // Log before filtering so we can see what's being excluded
    allItems.forEach(item => {
      console.log(`[CatalogService] Item "${item.title}" — isActive: ${item.isActive}, stock: ${item.stock}`);
    });

    // Lenient filter: only exclude items explicitly marked inactive
    const filtered = allItems.filter(item => {
      const isActiveOk = item.isActive !== false; // undefined/true → pass
      const stockOk = (item.stock ?? 1) > 0;      // undefined → assume in stock
      console.log(`[CatalogService] "${item.title}" passes filter: isActive=${isActiveOk}, stock=${stockOk}`);
      return isActiveOk && stockOk;
    });

    console.log(`[CatalogService] After filter: ${filtered.length} items`);
    return filtered;
  },

  // Real-time listener on rewards_catalog
  onVouchersChange(callback: (vouchers: RewardItem[]) => void): () => void {
    console.log('[CatalogService] Starting real-time listener on rewards_catalog...');
    const catalogRef = collection(firestoreDb, 'rewards_catalog');

    const unsubscribe = onSnapshot(
      catalogRef,
      (snapshot) => {
        console.log(`[CatalogService] onSnapshot fired — ${snapshot.docs.length} docs`);

        const allItems = snapshot.docs.map(mapDocToRewardItem) as (RewardItem & {
          isActive?: boolean;
          stock?: number;
        })[];

        const filtered = allItems.filter(item => {
          return item.isActive !== false && (item.stock ?? 1) > 0;
        });

        console.log(`[CatalogService] Real-time update: ${filtered.length}/${allItems.length} active items`);
        callback(filtered);
      },
      (error) => {
        console.error('[CatalogService] Snapshot listener error:', error);
        // Check if it's a permissions error
        if (error.code === 'permission-denied') {
          console.error('[CatalogService] ❌ Firestore rules blocking read on rewards_catalog!');
        }
      }
    );

    return unsubscribe;
  },
};