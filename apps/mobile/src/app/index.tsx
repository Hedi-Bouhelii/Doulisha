import { defaultLocale } from '@doulisha/i18n';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Placeholder home screen for Phase 0, in the default locale (French).
 * NativeWind, design tokens and i18n arrive in Phase 1.
 */
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Doulisha
      </Text>
      <Text style={styles.body}>Bientôt disponible ({defaultLocale}).</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F7F1E5',
  },
  title: { fontSize: 32, fontWeight: '700', color: '#2F5D3A' },
  body: { fontSize: 16, color: '#1F2A22' },
});
