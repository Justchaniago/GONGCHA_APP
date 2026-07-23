import { securityRepository } from '../composition/security';

export {
  DEFAULT_SECURITY_SETTINGS,
  type SecuritySettings,
} from '../application/security/SecuritySettings';

export const SecurityStorage = securityRepository;
