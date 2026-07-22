import { useFonts } from 'expo-font';

export default function useCustomFonts() {
  const [fontsLoaded, error] = useFonts({
    Coolvetica: require('../../assets/fonts/Coolvetica Hv Comp.otf'),
  });
  // Font error = still proceed, just without custom font
  return fontsLoaded || !!error;
}
