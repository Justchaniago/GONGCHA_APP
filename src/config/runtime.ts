export type RuntimeConfig =
  | { mode: 'legacy' }
  | {
      mode: 'local_emulator';
      host: '127.0.0.1' | '10.0.2.2';
      authEmulatorUrl: string;
      backendBaseUrl: string;
      projectId: 'demo-gongcha-local';
    };

export function resolveRuntimeConfig(
  mode: string | undefined,
  host: string | undefined,
  isDevelopment: boolean,
): RuntimeConfig {
  if (!mode) {
    if (host) {
      throw new Error('local_emulator_host_requires_runtime_mode');
    }
    return { mode: 'legacy' };
  }
  if (mode !== 'local_emulator') {
    throw new Error('unsupported_runtime_mode');
  }
  if (!isDevelopment) {
    throw new Error('local_emulator_requires_development_bundle');
  }
  if (host !== '127.0.0.1' && host !== '10.0.2.2') {
    throw new Error('local_emulator_host_not_allowed');
  }
  return {
    mode,
    host,
    authEmulatorUrl: `http://${host}:9099`,
    backendBaseUrl: `http://${host}:8000`,
    projectId: 'demo-gongcha-local',
  };
}

const isDevelopmentBundle =
  typeof __DEV__ !== 'undefined' && __DEV__ === true;

export const runtimeConfig = resolveRuntimeConfig(
  process.env.EXPO_PUBLIC_RUNTIME_MODE,
  process.env.EXPO_PUBLIC_LOCAL_HOST,
  isDevelopmentBundle,
);
