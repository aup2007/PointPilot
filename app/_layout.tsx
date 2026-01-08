import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function Layout() {
  // Only run this code in the browser, and only if we are NOT in a static build
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      html, body, #root {
        height: 100%;
        margin: 0;
        padding: 0;
        background-color: #000;
      }
    `;
    document.head.append(style);
  }

  return (
    <Stack screenOptions={{ 
      headerShown: false,
      contentStyle: { backgroundColor: '#000000' } // Ensure background is black
    }} />
  );
}