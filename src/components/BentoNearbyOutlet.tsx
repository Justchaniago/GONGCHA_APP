import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Navigation, MapPin, ChevronRight } from 'lucide-react-native';
import * as Location from 'expo-location';

interface StoreOutlet {
  id: string;
  name: string;
  lat: number;
  lng: number;
  openHours: string;
}

const GONGCHA_STORES: StoreOutlet[] = [
  {
    id: 'gi',
    name: 'Grand Indonesia',
    lat: -6.1950,
    lng: 106.8230,
    openHours: '08:00 - 22:00',
  },
  {
    id: 'cp',
    name: 'Central Park',
    lat: -6.1774,
    lng: 106.7907,
    openHours: '10:00 - 22:00',
  },
  {
    id: 'sencity',
    name: 'Senayan City',
    lat: -6.2272,
    lng: 106.7972,
    openHours: '10:00 - 22:00',
  },
];

// Calculate Haversine distance in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate Bearing in degrees
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin((lon2 - lon1) * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180));
  const x =
    Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
    Math.sin(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.cos((lon2 - lon1) * (Math.PI / 180));
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

interface BentoNearbyOutletProps {
  onPress?: (store: StoreOutlet) => void;
}

export default function BentoNearbyOutlet({ onPress }: BentoNearbyOutletProps) {
  const [nearestStore, setNearestStore] = useState<StoreOutlet>(GONGCHA_STORES[0]);
  const [distanceKm, setDistanceKm] = useState<number>(0.8);
  const [bearingDeg, setBearingDeg] = useState<number>(45);

  const rotateAnim = useRef(new Animated.Value(45)).current;
  const radarPulse = useRef(new Animated.Value(0)).current;

  // Radar Pulse Effect
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(radarPulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(radarPulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [radarPulse]);

  // Request Location & Heading
  useEffect(() => {
    let headingSub: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const userLat = loc.coords.latitude;
          const userLng = loc.coords.longitude;

          // Find closest store
          let closest = GONGCHA_STORES[0];
          let minD = Infinity;

          GONGCHA_STORES.forEach((store) => {
            const d = calculateDistanceKm(userLat, userLng, store.lat, store.lng);
            if (d < minD) {
              minD = d;
              closest = store;
            }
          });

          setNearestStore(closest);
          setDistanceKm(Math.round(minD * 10) / 10 || 0.8);

          const bearing = calculateBearing(userLat, userLng, closest.lat, closest.lng);
          setBearingDeg(bearing);

          // Watch heading for compass rotation
          headingSub = await Location.watchHeadingAsync((headingData) => {
            const mag = headingData.trueHeading > 0 ? headingData.trueHeading : headingData.magHeading;
            const targetAngle = (bearing - mag + 360) % 360;

            Animated.spring(rotateAnim, {
              toValue: targetAngle,
              friction: 8,
              tension: 40,
              useNativeDriver: true,
            }).start();
          });
        }
      } catch (err) {
        // Fallback to default simulated compass angle
        Animated.spring(rotateAnim, {
          toValue: 45,
          useNativeDriver: true,
        }).start();
      }
    })();

    return () => {
      if (headingSub) headingSub.remove();
    };
  }, [rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const pulseScale = radarPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });

  const pulseOpacity = radarPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => onPress && onPress(nearestStore)}
    >
      {/* HEADER ROW */}
      <View style={styles.headerRow}>
        <View style={styles.badgePill}>
          <MapPin size={10} color="#166534" />
          <Text style={styles.badgeText}>STORE TERDEKAT</Text>
        </View>
        <ChevronRight size={14} color="#A08F88" />
      </View>

      {/* RADAR COMPASS + DISTANCE RING */}
      <View style={styles.radarSection}>
        {/* Pulsing Ring */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
            },
          ]}
        />

        {/* Compass Center Ring */}
        <View style={styles.compassCenter}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Navigation size={20} color="#B91C2F" fill="#B91C2F" />
          </Animated.View>
        </View>

        {/* Real-time Distance Pill */}
        <View style={styles.distancePill}>
          <Text style={styles.distanceText}>{distanceKm} km</Text>
        </View>
      </View>

      {/* STORE NAME & STATUS */}
      <View style={styles.storeDetails}>
        <Text style={styles.storeName} numberOfLines={1}>
          Gong Cha {nearestStore.name}
        </Text>
        <View style={styles.statusRow}>
          <View style={styles.openDot} />
          <Text style={styles.statusText}>Buka s/d 22:00</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: 175,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F0E8E2',
    shadowColor: '#2A1F1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  badgeText: {
    color: '#166534',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  radarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 64,
    marginVertical: 2,
  },
  pulseRing: {
    position: 'absolute',
    width: 46,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(185, 28, 47, 0.12)',
  },
  compassCenter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF1F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFE4E6',
    shadowColor: '#B91C2F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  distancePill: {
    position: 'absolute',
    bottom: -2,
    backgroundColor: '#2A1F1F',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3D2F2F',
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  storeDetails: {
    alignItems: 'center',
    marginTop: 2,
  },
  storeName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2A1F1F',
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  statusText: {
    fontSize: 10,
    color: '#6C5F5A',
    fontWeight: '600',
  },
});
