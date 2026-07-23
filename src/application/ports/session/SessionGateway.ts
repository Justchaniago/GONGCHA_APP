import type { SessionIdentity } from '../../session/Session';

export interface SessionGateway {
  observe(
    onIdentity: (identity: SessionIdentity | null) => void,
    onError: () => void,
  ): () => void;
}
