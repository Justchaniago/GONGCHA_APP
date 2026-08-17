import { GestureHandlerRootView } from 'react-native-gesture-handler';
import './global.css';

import { EnvironmentProvider } from './src/context/EnvironmentContext';
import { runtimeConfig } from './src/config/runtime';

const RuntimeApp =
  runtimeConfig.mode === 'local_emulator'
    ? require('./src/runtime/LocalEmulatorApp').default
    : require('./src/runtime/LegacyApp').default;

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <EnvironmentProvider>
        <RuntimeApp />
      </EnvironmentProvider>
    </GestureHandlerRootView>
  );
}
