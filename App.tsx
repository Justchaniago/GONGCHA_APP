import './global.css';

import { EnvironmentProvider } from './src/context/EnvironmentContext';
import { runtimeConfig } from './src/config/runtime';

const RuntimeApp =
  runtimeConfig.mode === 'local_emulator'
    ? require('./src/runtime/LocalEmulatorApp').default
    : require('./src/runtime/LegacyApp').default;

export default function App() {
  return (
    <EnvironmentProvider>
      <RuntimeApp />
    </EnvironmentProvider>
  );
}
