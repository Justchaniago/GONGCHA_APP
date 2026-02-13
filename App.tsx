import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import MemberCardModal from './src/components/MemberCardModal';
import { MemberProvider } from './src/context/MemberContext';

export default function App() {
  return (
    <MemberProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <AppNavigator />
      </NavigationContainer>
      <MemberCardModal />
    </MemberProvider>
  );
}
