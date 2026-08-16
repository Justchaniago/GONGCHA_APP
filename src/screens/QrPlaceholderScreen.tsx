import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

export default function QrPlaceholderScreen() {
  const { t } = useTranslation();
  return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;
}
