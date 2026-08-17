import React from 'react';
import { View, StyleSheet, Modal, Text } from 'react-native';
import LottieView from 'lottie-react-native';

interface CheckInSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  message?: string;
}

export default function CheckInSuccessModal({ visible, onClose, message }: CheckInSuccessModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LottieView
            source={require('../../assets/animations/checkin_success.json')}
            autoPlay
            loop={false}
            style={styles.animation}
            onAnimationFinish={onClose}
          />
          {message && <Text style={styles.text}>{message}</Text>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 30, alignItems: 'center', width: '80%' },
  animation: { width: 150, height: 150 },
  text: { marginTop: 10, fontSize: 16, fontWeight: '600', color: '#1D1D1D', textAlign: 'center' },
});
