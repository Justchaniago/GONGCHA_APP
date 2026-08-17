import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, FlatList, ActivityIndicator, TextInput } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, MapPin, Navigation as NavIcon, Search, X, Plus, Minus, Locate, Clock } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useStores } from '../composition/stores';
import { buildStoresViewModel, visibleOrderedStores, type StoreDisplayItem } from '../application/stores/GetStores';
import { openStoreMaps } from '../presentation/stores/openStoreMaps';

function decodePolyline(encoded: string) {
  const points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

export default function StoreLocatorScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const mapRef = useRef<MapView>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<StoreDisplayItem | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // Polyline & Route ETA state
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [etaLabel, setEtaLabel] = useState('');
  const [routeDistance, setRouteDistance] = useState('');
  const [routingLoading, setRoutingLoading] = useState(false);

  const { stores, loading: storesLoading } = useStores(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      } catch (e) {
        console.log('Error fetching location on StoreLocatorScreen:', e);
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  const orderedStores = useMemo(() => visibleOrderedStores(stores, userLocation), [stores, userLocation]);
  const mappedStores = useMemo(() => buildStoresViewModel(orderedStores, userLocation), [orderedStores, userLocation]);
  
  const filteredStores = useMemo(() => {
    return mappedStores.filter((store) => 
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [mappedStores, searchQuery]);

  const loading = locationLoading || storesLoading;

  const initialRegion = useMemo(() => {
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }
    return {
      latitude: -6.2088,
      longitude: 106.8456,
      latitudeDelta: 0.12,
      longitudeDelta: 0.12,
    };
  }, [userLocation]);

  const generateSimulatedRoute = (storeLat: number, storeLng: number) => {
    if (!userLocation) return;
    const coords = [
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      { latitude: storeLat, longitude: storeLng },
    ];
    setRouteCoords(coords);

    const R = 6371;
    const dLat = (storeLat - userLocation.latitude) * Math.PI / 180;
    const dLon = (storeLng - userLocation.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(storeLat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;

    setRouteDistance(`${d.toFixed(1)} km`);
    const mins = Math.max(2, Math.round((d / 35) * 60));
    setEtaLabel(`${mins} mnt`);
  };

  const fetchRoute = async (storeLat: number, storeLng: number) => {
    if (!userLocation) return;
    setRoutingLoading(true);
    try {
      const apiKey = 'AIzaSyCM35_9b4XTSjJkYYR3rbTXbJxDz0tRMcc';
      const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: storeLat,
                longitude: storeLng,
              },
            },
          },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
        }),
      });
      console.warn('Google Routes API v2 response status:', res.status, res.statusText);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.warn('Google Routes API v2 returned non-JSON response:', text);
        generateSimulatedRoute(storeLat, storeLng);
        return;
      }

      if (!res.ok) {
        console.warn('Google Routes API v2 responded with error:', JSON.stringify(data));
        generateSimulatedRoute(storeLat, storeLng);
        return;
      }

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const points = decodePolyline(route.polyline.encodedPolyline);
        setRouteCoords(points);

        // Convert duration string (e.g. "720s") to minutes
        const secs = parseInt(route.duration.replace('s', '')) || 0;
        const mins = Math.max(1, Math.round(secs / 60));
        setEtaLabel(`${mins} mnt`);

        // Convert distance in meters to km
        const meters = route.distanceMeters || 0;
        const km = (meters / 1000).toFixed(1);
        setRouteDistance(`${km} km`);
      } else {
        console.warn('Google Routes API v2 returned OK but empty routes list.');
        generateSimulatedRoute(storeLat, storeLng);
      }
    } catch (e) {
      console.warn('Network or script error calling Google Routes API v2:', e);
      generateSimulatedRoute(storeLat, storeLng);
    } finally {
      setRoutingLoading(false);
    }
  };

  const handleSelectStore = (store: StoreDisplayItem) => {
    setSelectedStore(store);
    mapRef.current?.animateToRegion({
      latitude: store.latitude,
      longitude: store.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    }, 600);
    fetchRoute(store.latitude, store.longitude);
  };

  const handleZoomIn = async () => {
    const camera = await mapRef.current?.getCamera();
    if (camera) {
      if (camera.zoom !== undefined) {
        camera.zoom = camera.zoom + 1;
      } else if (camera.altitude !== undefined) {
        camera.altitude = Math.max(100, camera.altitude / 2);
      }
      mapRef.current?.animateCamera(camera, { duration: 250 });
    }
  };

  const handleZoomOut = async () => {
    const camera = await mapRef.current?.getCamera();
    if (camera) {
      if (camera.zoom !== undefined) {
        camera.zoom = Math.max(1, camera.zoom - 1);
      } else if (camera.altitude !== undefined) {
        camera.altitude = Math.min(10000000, camera.altitude * 2);
      }
      mapRef.current?.animateCamera(camera, { duration: 250 });
    }
  };

  const handleCenterMyLocation = () => {
    if (userLocation) {
      mapRef.current?.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      }, 500);
    }
  };

  useEffect(() => {
    setRouteCoords([]);
    setEtaLabel('');
    setRouteDistance('');
    setSelectedStore(null);
  }, [searchQuery]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1D1D1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.findStore')}</Text>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={18} color="#8C7B75" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari gerai Gong Cha..."
            placeholderTextColor="#A1887F"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <X size={18} color="#8C7B75" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={initialRegion}
          showsUserLocation={!!userLocation}
          mapPadding={{ top: 10, right: 10, bottom: 310, left: 10 }}
        >
          {filteredStores.map((store) => (
            <Marker
              key={store.id}
              coordinate={{ latitude: store.latitude, longitude: store.longitude }}
              title={store.name}
              description={store.address}
              pinColor={selectedStore?.id === store.id ? '#B91C2F' : '#3E342F'}
              onPress={() => handleSelectStore(store)}
            />
          ))}
          {routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor="#B91C2F"
              strokeWidth={4.5}
            />
          )}
        </MapView>

        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn} activeOpacity={0.8}>
            <Plus size={20} color="#1D1D1F" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={handleZoomOut} activeOpacity={0.8}>
            <Minus size={20} color="#1D1D1F" />
          </TouchableOpacity>
          {userLocation && (
            <TouchableOpacity style={[styles.controlButton, styles.locateButton]} onPress={handleCenterMyLocation} activeOpacity={0.8}>
              <Locate size={20} color="#B91C2F" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.dragHandle} />
        
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color="#B91C2F" />
            <Text style={styles.loadingText}>Mencari lokasi Gong Cha...</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>Store Terdekat</Text>
            <FlatList
              data={filteredStores}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedStore?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.storeItem, isSelected && styles.storeItemSelected]}
                    onPress={() => handleSelectStore(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.storeInfoRow}>
                      <MapPin size={20} color={isSelected ? '#B91C2F' : '#8C7B75'} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.storeName, isSelected && styles.storeNameSelected]}>
                          {item.name}
                        </Text>
                        <Text style={styles.storeAddress} numberOfLines={1}>
                          {item.address}
                        </Text>
                        {isSelected && (etaLabel || routeDistance) ? (
                          <View style={styles.etaContainer}>
                            <Clock size={12} color="#B91C2F" />
                            <Text style={styles.etaText}>
                              {routingLoading ? 'Menghitung rute...' : `${etaLabel} (${routeDistance})`}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.storeMeta}>
                            {item.distanceLabel ? `${item.distanceLabel} • ` : ''}
                            {item.isOpen ? 'Buka' : 'Tutup'}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.directionButton}
                        onPress={() => openStoreMaps(item.latitude, item.longitude, item.name, item.address)}
                      >
                        <NavIcon size={16} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16, backgroundColor: '#FAF8F5', zIndex: 10 },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1D1D1F' },
  searchSection: { paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#FAF8F5', borderBottomWidth: 1, borderColor: '#EFECE7', zIndex: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#E5E7EB' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1D1D1F', fontWeight: '500' },
  clearButton: { padding: 4 },
  mapContainer: { flex: 1, position: 'relative' },
  mapControls: { position: 'absolute', right: 16, top: 16, gap: 8 },
  controlButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  locateButton: { marginTop: 8 },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 310, backgroundColor: '#FAF8F5', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1D1D1F', marginBottom: 12 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8, fontSize: 13, color: '#8C7B75' },
  storeItem: { padding: 14, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#EFECE7', marginBottom: 10 },
  storeItemSelected: { borderColor: '#B91C2F', backgroundColor: '#FFF8F8' },
  storeInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storeName: { fontSize: 14, fontWeight: '700', color: '#1D1D1F' },
  storeNameSelected: { color: '#B91C2F' },
  storeAddress: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  storeMeta: { fontSize: 11, fontWeight: '600', color: '#8C7B75', marginTop: 4 },
  etaContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  etaText: { fontSize: 11, fontWeight: '700', color: '#B91C2F' },
  directionButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#B91C2F', alignItems: 'center', justifyContent: 'center' },
});
