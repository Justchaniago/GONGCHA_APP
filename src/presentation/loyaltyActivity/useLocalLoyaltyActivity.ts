import { useEffect, useState } from 'react';

import type { LoyaltyActivityController } from '../../application/loyaltyActivity/LoyaltyActivityController';
import type { LoyaltyActivityState } from '../../application/loyaltyActivity/LoyaltyActivity';

export function useLocalLoyaltyActivity(
  controller: LoyaltyActivityController,
  uid: string | null,
): LoyaltyActivityState {
  const [state, setState] = useState(controller.getState());

  useEffect(() => {
    const unsubscribe = controller.observe(setState);
    if (uid) {
      controller.start(uid);
    } else {
      controller.stop();
    }
    return () => {
      unsubscribe();
      controller.stop();
    };
  }, [controller, uid]);

  return state;
}
