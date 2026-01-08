import React, { useState, useEffect } from 'react';

import { 
  View,
  Animated, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Switch, 
  SafeAreaView, 
  ScrollView, 
  StatusBar, 
  StyleSheet, 
  Platform, 
  ActivityIndicator, 
  LayoutAnimation,
  UIManager,
  Alert 
} from 'react-native';
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter } from 'expo-router';

// --- CONFIGURATION ---
const API_URL_BASE = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'https://pointpilot.onrender.com';

const COLORS = {
  bg: '#000000',
  card: '#0D0D0D',
  border: '#1A1A1A',
  blue: '#aad2fb',      
  text: '#FFFFFF',
  textDim: '#666666',
  green: '#30D158',
  glow: 'rgba(170, 210, 251, 0.15)',
};

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export default function TransferLab() {
  const router = useRouter();
  const [mode, setMode] = useState('flight');
  const [origin, setOrigin] = useState('');     
  const [destination, setDestination] = useState(''); 
  const [isRentDay, setIsRentDay] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (result) {
      fadeAnim.setValue(0);
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [result]);

  const handleOptimize = async () => {
    if (!origin) {
      Alert.alert("Input Error", "Please enter a City or Airport code");
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoading(true);
    setResult(null);

    const endpoint = mode === 'flight' ? '/optimize/flight' : '/optimize/hotel';
    
    // BUILD CLEAN REQUEST BODY (No 'program' variable used here)
    const requestBody = mode === 'flight' 
      ? {
          origin: origin.toUpperCase(),
          destination: destination.toUpperCase(),
          date: '2025-06-15',
          is_rent_day: isRentDay,
        }
      : {
          city_code: origin.toUpperCase(),
          date: '2025-06-15',
          is_rent_day: isRentDay,
        };

    try {
      const response = await fetch(`${API_URL_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      setResult(data);
    } catch (error) {
      Alert.alert("Error", "Backend Offline - Ensure main.py is running");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.replace('/')} // Force navigation to the landing page
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Text style={styles.backText}>← EXIT ENGINE</Text>
        </TouchableOpacity>
        
        <Text style={styles.brandTitle}>
          POINTPILOT <Text style={styles.brandSubtitle}>TRANSFER LAB</Text>
        </Text>
    </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.modeContainer}>
          {['flight', 'hotel'].map((m) => (
            <TouchableOpacity key={m} onPress={() => {setMode(m); setResult(null);}} style={[styles.modeButton, mode === m && styles.modeButtonActive]}>
              <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m.toUpperCase()}S</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.sectionLabel}>OPTIMIZATION PARAMETERS</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>FROM</Text>
              <TextInput value={origin} onChangeText={setOrigin} style={styles.largeInput} placeholder="JFK" placeholderTextColor="#333" maxLength={3} />
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{mode === 'flight' ? 'TO' : 'ANALYSIS'}</Text>
              {mode === 'flight' ? (
                <TextInput value={destination} onChangeText={setDestination} style={[styles.largeInput, { color: COLORS.blue }]} placeholder="LHR" placeholderTextColor="#333" maxLength={3} />
              ) : (
                <View style={{ alignItems: 'center', marginTop: 5 }}>
                  <Text style={[styles.largeInput, { fontSize: 20, color: COLORS.blue }]}>MULTI</Text>
                  <Text style={[styles.largeInput, { fontSize: 10, color: COLORS.textDim }]}>PARTNER</Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.toggleRow, isRentDay && styles.toggleRowActive]}>
            <View>
              <Text style={[styles.toggleTitle, isRentDay && {color: '#000'}]}>Rent Day Bonus</Text>
              <Text style={[styles.toggleSub, isRentDay && {color: '#333'}]}>{isRentDay ? "ACTIVE: 2X Multiplier" : "Standard Value"}</Text>
            </View>
            <Switch trackColor={{ false: "#222", true: "#000" }} thumbColor={isRentDay ? "#FFF" : "#444"} onValueChange={() => setIsRentDay(!isRentDay)} value={isRentDay} />
          </View>

          <TouchableOpacity style={styles.runButton} onPress={handleOptimize} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.runButtonText}>ANALYZE VALUE</Text>}
          </TouchableOpacity>
        </View>

        {result && (
          <Animated.View style={[
      styles.resultsWrapper, 
      { 
        opacity: fadeAnim, 
        transform: [{
          translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0] 
          })
        }]
      }
    ]}>
            <View style={styles.transparencyCard}>
              <Text style={styles.transparencyTitle}>
                {mode === 'hotel' && result?.market_baseline?.property 
                  ? `ACCELERATOR: ${result.market_baseline.property.toUpperCase()}` 
                  : "VALUE ACCELERATION SUMMARY"}
              </Text>
              <View style={styles.comparisonScale}>
                <View style={styles.scaleItem}>
                  <Text style={styles.scaleLabel}>BASE PORTAL</Text>
                  <Text style={styles.scaleValue}>1.25¢</Text>
                </View>
                <View style={styles.scaleDivider} />
                <View style={styles.scaleItem}>
                  <Text style={[styles.scaleLabel, {color: COLORS.blue}]}>EXPERT TRANSFER</Text>
                  <Text style={[styles.scaleValue, {color: COLORS.blue}]}>{result.best_option.cpp}¢</Text>
                </View>
              </View>
              <View style={styles.savingsBanner}>
                <Text style={styles.savingsText}>
                  ACCELERATING YOUR VALUE BY <Text style={{fontWeight: '900'}}>${result.best_option.cash_savings}</Text>
                </Text>
              </View>
            </View>

            <Text style={styles.matrixTitle}>OPTIMIZED PARTNER LIST</Text>
            {result.results.map((item, index) => (
              <View key={index} style={[styles.matrixRow, item.status === 'EXCELLENT' && styles.excellentRow]}>
                <View>
                  <Text style={styles.partnerNameText}>{item.partner.toUpperCase()}</Text>
                  <Text style={styles.pointsSubText}>{item.points_required.toLocaleString()} BILT PTS</Text>
                </View>
                <View style={styles.valColumn}>
                  <Text style={[styles.cppText, {color: item.status === 'EXCELLENT' ? COLORS.green : '#FFF'}]}>{item.cpp}¢</Text>
                  <Text style={styles.statusSubText}>{item.status}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, Platform.select({
    web: { 
      height: '100vh', 
      width: '100vw',
      overflow: 'hidden' 
    },
    default: {}
  }) },
  scrollContent: { padding: 20, paddingBottom: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backText: { color: COLORS.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  brandTitle: { color: '#FFF', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  brandSubtitle: { color: COLORS.blue },
  modeContainer: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, padding: 4, marginBottom: 20 },
  modeButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  modeButtonActive: { backgroundColor: COLORS.blue },
  modeText: { color: '#666', fontSize: 10, fontWeight: '800' },
  modeTextActive: { color: '#000' },
  mainCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 24, padding: 24, marginBottom: 24 },
  sectionLabel: { color: COLORS.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 24 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  inputWrapper: { flex: 1, alignItems: 'center' },
  verticalDivider: { width: 1, height: '100%', backgroundColor: COLORS.border, marginHorizontal: 16 },
  inputLabel: { color: COLORS.textDim, fontSize: 10, fontWeight: '700', marginBottom: 12 },
  largeInput: { color: '#FFF', fontSize: 32, fontWeight: '300', textAlign: 'center', fontFamily: MONO },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#151515', padding: 16, borderRadius: 12 },
  toggleRowActive: { backgroundColor: COLORS.blue },
  toggleTitle: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  toggleSub: { color: COLORS.textDim, fontSize: 10 },
  runButton: { backgroundColor: COLORS.blue, paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  runButtonText: { color: '#000', fontWeight: '900', fontSize: 11, letterSpacing: 1.5 },
  resultCardHidden: {
    opacity: 0,
    transform: [{ translateY: 20 }],
  },
  transparencyCard: { backgroundColor: '#0D0D0D', borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: '#222' },
  transparencyTitle: { color: '#444', fontSize: 9, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 20 },
  comparisonScale: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  scaleItem: { alignItems: 'center' },
  scaleLabel: { color: '#444', fontSize: 8, fontWeight: '800', marginBottom: 4 },
  scaleValue: { color: '#FFF', fontSize: 28, fontWeight: '300', fontFamily: MONO },
  scaleDivider: { width: 1, height: 40, backgroundColor: '#222' },
  savingsBanner: { backgroundColor: COLORS.glow, marginTop: 24, padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(170, 210, 251, 0.3)' },
  savingsText: { color: COLORS.blue, fontSize: 11, fontWeight: '800' },
  matrixTitle: { color: '#FFF', fontSize: 12, fontWeight: '900', marginBottom: 16, marginLeft: 4 },
  matrixRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#080808', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#111', marginBottom: 12 },
  excellentRow: { borderColor: 'rgba(48, 209, 88, 0.3)', backgroundColor: 'rgba(48, 209, 88, 0.02)' },
  partnerNameText: { color: '#FFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  pointsSubText: { color: '#444', fontSize: 10, fontWeight: '600', marginTop: 4 },
  valColumn: { alignItems: 'flex-end' },
  cppText: { fontSize: 20, fontWeight: '300', fontFamily: MONO },
  statusSubText: { fontSize: 8, fontWeight: '900', color: '#333', marginTop: 2 },
  footerText: { textAlign: 'center', color: '#222', fontSize: 9, fontWeight: '800', marginTop: 40 }
});