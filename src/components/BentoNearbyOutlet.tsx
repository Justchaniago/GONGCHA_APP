import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';

// ── Design tokens (sync: DESIGN_SYSTEM.html) ─────────────────────
const RED     = '#B91C2F';
const RED_L   = '#F9E8E9';
const DARK    = '#1D1D1D';
const NEUTRAL = '#F5F5F5';
const MUTED   = '#7C6E68';
const BORDER  = '#EFECE7';
const WHITE   = '#FFFFFF';

interface StoreOutlet {
  id: string;
  name: string;
  lat: number;
  lng: number;
  openHours: string;
}

function calculateDistanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateBearing(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const y = Math.sin((lon2 - lon1) * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180));
  const x =
    Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
    Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.cos((lon2 - lon1) * (Math.PI / 180));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

interface BentoNearbyOutletProps {
  stores?: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    openHours?: string;
    isActive?: boolean;
  }>;
  onPress?: () => void;
}

export default function BentoNearbyOutlet(props: BentoNearbyOutletProps) {
  const { t } = useTranslation();
  const { stores = [], onPress } = props;
  const activeStores: StoreOutlet[] = useMemo(
    () =>
      stores
        .filter((s) => s.isActive !== false)
        .map((s) => ({
          id: s.id,
          name: s.name.startsWith('Gong Cha ') ? s.name.substring(9) : s.name,
          lat: s.latitude,
          lng: s.longitude,
          openHours: s.openHours ?? '10:00 – 22:00',
        })),
    [stores],
  );

  const [nearestStore, setNearestStore] = useState<StoreOutlet | null>(
    activeStores[0] ?? null,
  );
  const [distanceKm, setDistanceKm]         = useState<number>(0.8);
  const [bearing, setBearing]               = useState<number>(45);
  const [compassHeading, setCompassHeading] = useState<number>(0);

  const radarPulse  = useRef(new Animated.Value(0)).current;
  const arrowRotate = useRef(new Animated.Value(45)).current;

  useEffect(() => {
    if (activeStores.length > 0) setNearestStore(activeStores[0]);
  }, [activeStores]);

  // Pulse loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(radarPulse, {
          toValue: 1, duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(radarPulse, {
          toValue: 0, duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [radarPulse]);

  // Location + heading
  useEffect(() => {
    if (activeStores.length === 0) return;
    let headingSub: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude: userLat, longitude: userLng } = loc.coords;
        let closest = activeStores[0];
        let minD = Infinity;
        activeStores.forEach((store) => {
          const d = calculateDistanceKm(userLat, userLng, store.lat, store.lng);
          if (d < minD) { minD = d; closest = store; }
        });
        setNearestStore(closest);
        setDistanceKm(minD);
        setBearing(calculateBearing(userLat, userLng, closest.lat, closest.lng));
        headingSub = await Location.watchHeadingAsync((h) => {
          setCompassHeading(h.trueHeading ?? h.magHeading);
        });
      } catch (_) { /* fallback to static */ }
    })();
    return () => { headingSub?.remove(); };
  }, [activeStores]);

  // Compass arrow spring
  useEffect(() => {
    Animated.spring(arrowRotate, {
      toValue: (bearing - compassHeading + 360) % 360,
      useNativeDriver: true,
      damping: 12, stiffness: 80,
    }).start();
  }, [bearing, compassHeading]);

  const pulseScale   = radarPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const pulseOpacity = radarPulse.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.3, 0.15, 0] });
  const arrowStyle   = {
    transform: [{
      rotate: arrowRotate.interpolate({
        inputRange: [0, 360], outputRange: ['0deg', '360deg'],
      }),
    }],
  };

  if (!nearestStore) return null;

  const distLabel = distanceKm < 1
    ? `${Math.round(distanceKm * 1000)} m`
    : `${distanceKm.toFixed(1)} km`;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.88}
      onPress={onPress}
    >
      {/* LABEL ROW */}
      <View style={styles.labelRow}>
        <View style={styles.iconBg}>
          <MapPin size={12} color={RED} />
        </View>
        <Text style={styles.label}>Outlet Terdekat</Text>
      </View>

      {/* DISTANCE — large focal number */}
      <View style={styles.distRow}>
        <Text style={styles.distNumber}>{distLabel}</Text>
        {/* animated compass arrow */}
        <View style={styles.compassWrap}>
          <Animated.View
            style={[styles.pulse, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]}
          />
          <View style={styles.compassCircle}>
            <Animated.View style={arrowStyle}>
              <Navigation size={16} color={RED} strokeWidth={2.5} />
            </Animated.View>
          </View>
        </View>
      </View>

      {/* STORE NAME — no prefix duplication; name already stripped at normalise step */}
      <Text style={styles.storeName} numberOfLines={2}>
        {nearestStore.name}
      </Text>

      {/* OPEN HOURS */}
      <Text style={styles.openHours}>{nearestStore.openHours}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 180,
    backgroundColor: WHITE,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    justifyContent: 'space-between',
  },

  // top label
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBg: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: RED_L,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: MUTED,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // distance row: big number + compass
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: DARK,
    letterSpacing: -1,
    lineHeight: 36,
  },
  compassWrap: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: RED_L,
  },
  compassCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: NEUTRAL,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // store name + hours
  storeName: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK,
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  openHours: {
    fontSize: 10,
    fontWeight: '500',
    color: MUTED,
  },
});
