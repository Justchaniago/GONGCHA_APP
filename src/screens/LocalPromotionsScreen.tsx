import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Image,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  buildLocalPromotionsViewModel,
  PromotionDisplayItem,
} from '../application/promotions/PromotionsViewModel';
import { PromotionsView } from '../presentation/promotions/PromotionsView';

const { width: SW, height: SH } = Dimensions.get('window');
const CARD_W = SW - 48;
const CARD_H = Math.min(CARD_W * (4 / 3), SH * 0.75);

const MOCK_PROMOS = [
  {
    id: 'p_hero',
    title: 'Buy 1 Get 1 Pearl Milk Tea',
    subtitle: 'Treat yourself and a friend to our signature Pearl Milk Tea!',
    imageUrl: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=800',
    bannerType: 'hero',
    active: true,
    formattedPeriod: 'Valid: Thursdays only',
  },
  {
    id: 'p_card',
    title: 'Weekend Double Leaves Promo',
    subtitle: 'Earn 2x Leaves on all orders placed every Saturday and Sunday.',
    imageUrl: 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=800',
    bannerType: 'card',
    active: true,
    formattedPeriod: 'Every Sat & Sun',
  },
  {
    id: 'p_modal',
    title: 'New Seasonal Taro Foam Series',
    subtitle: 'Sip on the dreamy purple cloud of fresh Taro and cream foam!',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800',
    bannerType: 'modal',
    active: true,
    formattedPeriod: 'Limited Autumn Edition',
  },
];

export default function LocalPromotionsScreen({ navigation }: any) {
  const [modalVisible, setModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const viewModel = buildLocalPromotionsViewModel(MOCK_PROMOS);
  const modalPromo = viewModel.promoModalBanner;

  // Automatically show the promo modal on screen mount
  useEffect(() => {
    if (modalPromo) {
      const timer = setTimeout(() => {
        setModalVisible(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [modalPromo]);

  useEffect(() => {
    if (modalVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
    }
  }, [modalVisible]);

  const handleCloseModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
    });
  };

  const handleSelectPromo = (promo: PromotionDisplayItem) => {
    alert(`Selected Promotion:\n\n${promo.title}\n${promo.formattedPeriod}`);
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
      {/* Top Navigation Row */}
      <View style={styles.navHeader}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Kembali</Text>
        </Pressable>
        {modalPromo && (
          <Pressable style={styles.modalTrigger} onPress={() => setModalVisible(true)}>
            <Text style={styles.modalTriggerText}>🎁 Lihat Modal Ad</Text>
          </Pressable>
        )}
      </View>

      <PromotionsView viewModel={viewModel} onSelectPromo={handleSelectPromo} />

      {/* Premium Promo Modal Overlay */}
      {modalPromo && (
        <Modal
          visible={modalVisible}
          transparent
          animationType="none"
          onRequestClose={handleCloseModal}
        >
          <Animated.View style={[styles.modalBackdrop, { opacity: fadeAnim }]}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={handleCloseModal} />

            <Animated.View
              style={[
                styles.modalCard,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <Image source={{ uri: modalPromo.imageUrl }} style={styles.modalImage} />

              <View style={styles.modalContent}>
                <View style={styles.modalTag}>
                  <Text style={styles.modalTagText}>{modalPromo.formattedPeriod}</Text>
                </View>
                <Text style={styles.modalTitle}>{modalPromo.title}</Text>
                <Text style={styles.modalSubtitle}>{modalPromo.subtitle}</Text>

                <Pressable style={styles.modalCloseButton} onPress={handleCloseModal}>
                  <Text style={styles.modalCloseButtonText}>Sip, Terima Kasih!</Text>
                </Pressable>
              </View>
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEF',
    backgroundColor: '#FFF',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  backButtonText: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  modalTrigger: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#8A1C14',
  },
  modalTriggerText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  modalImage: {
    width: '100%',
    height: '55%',
  },
  modalContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  modalTag: {
    backgroundColor: '#FFEBEC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'center',
  },
  modalTagText: {
    color: '#8A1C14',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
    marginTop: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#65656B',
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: 8,
  },
  modalCloseButton: {
    backgroundColor: '#8A1C14',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
