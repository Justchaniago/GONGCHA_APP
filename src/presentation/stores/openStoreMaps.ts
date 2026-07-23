import {
  ActionSheetIOS,
  Alert,
  Linking,
  Platform,
} from 'react-native';

interface MapApp {
  label: string;
  probeUrls?: string[];
  openUrl: string;
}

export async function openStoreMaps(
  latitude: number,
  longitude: number,
  label: string,
  address?: string,
) {
  const latLng = `${latitude},${longitude}`;
  const query = address ? `${label}, ${address}` : label;
  const queryEncoded = encodeURIComponent(query);
  const appleMapsUrl = `maps:0,0?q=${queryEncoded}&ll=${latLng}`;
  const webGoogleUrl = `https://www.google.com/maps/search/?api=1&query=${queryEncoded}`;

  const mapApps: MapApp[] =
    Platform.select({
      ios: [
        {
          label: 'Google Maps',
          probeUrls: ['comgooglemaps://', 'comgooglemaps-x-callback://'],
          openUrl: `comgooglemaps://?q=${queryEncoded}@${latLng}`,
        },
        {
          label: 'Waze',
          probeUrls: ['waze://'],
          openUrl: `waze://?ll=${latLng}&navigate=yes`,
        },
        { label: 'Apple Maps', openUrl: appleMapsUrl },
      ],
      android: [
        {
          label: 'Google Maps',
          probeUrls: ['comgooglemaps://', 'google.navigation:'],
          openUrl: `google.navigation:q=${queryEncoded}`,
        },
        {
          label: 'Waze',
          probeUrls: ['waze://'],
          openUrl: `waze://?ll=${latLng}&navigate=yes`,
        },
      ],
      default: [],
    }) || [];

  const detectedApps: Array<{ label: string; run: () => void }> = [];
  for (const app of mapApps) {
    let available = !app.probeUrls || app.probeUrls.length === 0;
    for (const probeUrl of app.probeUrls || []) {
      try {
        if (await Linking.canOpenURL(probeUrl)) {
          available = true;
          break;
        }
      } catch {
        available = false;
      }
    }

    if (available) {
      detectedApps.push({
        label: app.label,
        run: () => {
          Linking.openURL(app.openUrl).catch(() => {
            void Linking.openURL(webGoogleUrl);
          });
        },
      });
    }
  }

  const hasNativeGoogleMaps = detectedApps.some(
    (app) => app.label === 'Google Maps',
  );
  detectedApps.push({
    label: hasNativeGoogleMaps ? 'Google Maps (Web)' : 'Google Maps',
    run: () => {
      void Linking.openURL(webGoogleUrl);
    },
  });

  if (Platform.OS === 'ios') {
    const options = [...detectedApps.map((item) => item.label), 'Cancel'];
    const cancelButtonIndex = options.length - 1;
    ActionSheetIOS.showActionSheetWithOptions(
      { title: label, message: address, options, cancelButtonIndex },
      (buttonIndex) => {
        if (buttonIndex !== cancelButtonIndex) {
          detectedApps[buttonIndex]?.run();
        }
      },
    );
    return;
  }

  const alertOptions: Array<{
    text: string;
    onPress: () => void;
    style?: 'cancel';
  }> = detectedApps.map((app) => ({
    text: app.label,
    onPress: app.run,
  }));
  alertOptions.push({ text: 'Cancel', onPress: () => {}, style: 'cancel' });
  Alert.alert('Open Maps', `${label}\n${address || ''}`, alertOptions);
}
