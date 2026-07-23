import { authCommands } from '../composition/auth';
import { profileCommands } from '../composition/profile';
import type { UserProfile, UserVoucher } from '../types/types';
import { BackendApi } from './BackendApi';

export const UserService = {
  getUserProfile(): Promise<UserProfile | null> {
    return profileCommands.getCurrent() as Promise<UserProfile | null>;
  },

  updateProfile(updates: Partial<UserProfile>) {
    return profileCommands.updateCurrent(updates);
  },

  async redeemVoucher(reward: any) {
    if (!authCommands.currentSubject()) throw new Error('User not found');
    const response = await BackendApi.redeemVoucher(reward.id);
    return response.voucher as UserVoucher;
  },

  async getVoucherCheckoutPayload(voucher: UserVoucher) {
    const userId = authCommands.currentSubject();
    if (!userId) throw new Error('User belum login');
    return `VOUCHER:${userId}:${voucher.code}`;
  },
};
