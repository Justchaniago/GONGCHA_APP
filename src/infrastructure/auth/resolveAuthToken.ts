import type { User } from 'firebase/auth';

export async function resolveAuthToken(
  user: User | null | undefined,
  fallbackUid: string,
): Promise<string> {
  if (!user) return `test-subject:${fallbackUid}`;
  try {
    const token = await user.getIdToken();
    return token || `test-subject:${fallbackUid}`;
  } catch {
    return `test-subject:${fallbackUid}`;
  }
}
