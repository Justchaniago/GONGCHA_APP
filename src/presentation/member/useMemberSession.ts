import { useEffect, useState } from 'react';

import type {
  MemberSessionController,
  MemberSessionState,
} from '../../application/session/MemberSessionController';

export function useMemberSession(
  controller: MemberSessionController,
): MemberSessionState {
  const [state, setState] = useState(controller.getState());

  useEffect(() => controller.observe(setState), [controller]);

  return state;
}
