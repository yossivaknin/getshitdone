'use client'

import { useEffect } from 'react';

export function CapacitorInit() {
  useEffect(() => {
    // Only run in Capacitor environment
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      const { App, StatusBar, SplashScreen } = require('@capacitor/app');
      const { Keyboard } = require('@capacitor/keyboard');
      
      // Handle app state changes
      App.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active?', isActive);
      });

      // Handle back button (Android)
      App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          App.exitApp();
        } else {
          window.history.back();
        }
      });

      // Configure status bar
      StatusBar.setStyle({ style: 'dark' });
      StatusBar.setBackgroundColor({ color: '#1A1A1A' });

      // Hide splash screen after app is ready
      SplashScreen.hide();

      // Handle keyboard events
      Keyboard.addListener('keyboardWillShow', (info) => {
        console.log('Keyboard will show with height:', info.keyboardHeight);
      });

      Keyboard.addListener('keyboardWillHide', () => {
        console.log('Keyboard will hide');
      });

      // Cleanup
      return () => {
        App.removeAllListeners();
        Keyboard.removeAllListeners();
      };
    }
  }, []);

  return null;
}

