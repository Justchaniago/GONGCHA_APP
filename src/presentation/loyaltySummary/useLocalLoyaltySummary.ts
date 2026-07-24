import { useEffect, useState } from 'react';

import type { LoyaltySummaryController } from '../../application/loyaltySummary/LoyaltySummaryController';
import type { LoyaltySummaryState } from '../../application/loyaltySummary/LoyaltySummary';

export function useLocalLoyaltySummary(
  controller: LoyaltySummaryController,
  uid: string | null,
): LoyaltySummaryState {
  const [state, setState] = useState(controller.getState());

  useEffect(() => {
    const unsubscribe = controller.observe(setState);
    if (uid) controller.start(uid);
    else controller.stop();
    return () => {
      unsubscribe();
      controller.stop();
    };
  }, [controller, uid]);

  return state;
}
