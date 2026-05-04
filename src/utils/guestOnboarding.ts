import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_ONBOARDING_KEY = 'guest_onboarding_completed_v1';

export async function hasCompletedGuestOnboarding() {
  const value = await AsyncStorage.getItem(GUEST_ONBOARDING_KEY);
  return value === 'true';
}

export async function markGuestOnboardingCompleted() {
  await AsyncStorage.setItem(GUEST_ONBOARDING_KEY, 'true');
}
