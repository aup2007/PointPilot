import React, { useState, useEffect } from 'react';
import { 
  View,
  Animated, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  StatusBar, 
  StyleSheet, 
  Platform, 
  ActivityIndicator, 
  LayoutAnimation,
  UIManager,
  Alert,
  Modal,
  FlatList
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const API_URL_BASE = 
  Platform.OS === 'android' 
    ? 'http://10.0.2.2:8000' 
    : Platform.OS === 'web'
      ? 'https://pointpilot.onrender.com' 
      : 'https://pointpilot.onrender.com';

const COLORS = {
  bg: '#000000',
  card: '#0D0D0D',
  border: '#1A1A1A',
  blue: '#aad2fb',      
  text: '#FFFFFF',
  textDim: '#666666',
  green: '#30D158',
  gold: '#D4AF37',
  glow: 'rgba(170, 210, 251, 0.15)',
};

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

// --- DATA LISTS ---
const AIRPORTS = [
  { code: 'JFK', name: 'New York (JFK)' },
  { code: 'LHR', name: 'London Heathrow' },
  { code: 'CDG', name: 'Paris Charles de Gaulle' },
  { code: 'HND', name: 'Tokyo Haneda' },
  { code: 'NRT', "name": 'Tokyo Narita' },
  { code: 'DXB', name: 'Dubai International' },
  { code: 'SIN', name: 'Singapore Changi' },
  { code: 'LAX', name: 'Los Angeles' },
  { code: 'SFO', name: 'San Francisco' },
  { code: 'MIA', name: 'Miami International' },
  { code: 'EZE', name: 'Buenos Aires' },
  { code: 'SYD', name: 'Sydney Kingsford Smith' },
];

const CITIES = [
  { code: 'NYC', name: 'New York City' },
  { code: 'LON', name: 'London' },
  { code: 'PAR', name: 'Paris' },
  { code: 'TYO', name: 'Tokyo' },
  { code: 'DXB', name: 'Dubai' },
  { code: 'SIN', name: 'Singapore' },
  { code: 'LAX', name: 'Los Angeles' },
];

// --- HELPERS ---
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') window.alert(`${title}: ${message}`);
  else Alert.alert(title, message);
};

const formatWithDashes = (text: string) => {
  const cleaned = text.replace(/[^0-9]/g, '');
  let formatted = cleaned;
  if (cleaned.length > 4) formatted = cleaned.slice(0, 4) + '-' + cleaned.slice(4);
  if (cleaned.length > 6) formatted = formatted.slice(0, 7) + '-' + formatted.slice(7);
  return formatted.slice(0, 10);
};

const parseLocal = (dateStr: string) => {
  if (!dateStr || dateStr.length !== 10) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; 
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  d.setHours(0, 0, 0, 0); 
  return d;
};

export default function TransferLab() {
  const router = useRouter();
  const { rentDayOverride } = useLocalSearchParams();
  
  const [mode, setMode] = useState('flight');
  const [origin, setOrigin] = useState('JFK');     
  const [destination, setDestination] = useState('LHR'); 
  const [date, setDate] = useState('2025-06-15'); 
  const [returnDate, setReturnDate] = useState('');

  // --- MODAL STATE ---
  const [modalVisible, setModalVisible] = useState(false);
  const [activeField, setActiveField] = useState<'origin' | 'destination'>('origin');
  const [searchQuery, setSearchQuery] = useState('');

  // --- RENT DAY LOGIC ---
  const [isRentDay, setIsRentDay] = useState(false);
  const [advisory, setAdvisory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const today = new Date();
    const isDevMode = rentDayOverride === 'true';

    if (isDevMode) {
      setAdvisory("🛠️ DEV MODE: RENT DAY APPROACHING (5 DAYS) • WAIT FOR 2X");
      setIsRentDay(false);
    } 
    else if (today.getDate() === 1) {
      setAdvisory("RENT DAY ACTIVE • 2X TRANSFER BONUS LIVE");
      setIsRentDay(true);
    }
    else if (today.getDate() >= 25) {
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const daysLeft = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      setAdvisory(`RENT DAY APPROACHING (${daysLeft} DAYS) • WAIT FOR 2X BONUS`);
      setIsRentDay(false);
    } 
    else {
      setAdvisory(null);
      setIsRentDay(false);
    }
  }, [rentDayOverride]);

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

  const handleDateChange = (text: string) => setDate(formatWithDashes(text));
  const handleReturnDateChange = (text: string) => setReturnDate(formatWithDashes(text));

  // --- SELECTION LOGIC ---
  const openSelection = (field: 'origin' | 'destination') => {
    setActiveField(field);
    setSearchQuery('');
    setModalVisible(true);
  };

  const selectLocation = (code: string) => {
    if (activeField === 'origin') setOrigin(code);
    else setDestination(code);
    setModalVisible(false);
  };

  const getFilteredList = () => {
    const list = mode === 'flight' ? AIRPORTS : CITIES;
    if (!searchQuery) return list;
    return list.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleOptimize = async () => {
    if (!origin || !date) {
      showAlert("Missing Info", "Please select Locations and Date");
      return;
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const tripDate = parseLocal(date);
    
    if (!tripDate || isNaN(tripDate.getTime()) || date.length !== 10) {
      showAlert("Invalid Date", "Please enter YYYY-MM-DD (e.g. 2025-06-15)");
      return;
    }
    if (tripDate < today) {
      showAlert("Date Error", "You cannot travel in the past!");
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoading(true);
    setResult(null);

    const endpoint = mode === 'flight' ? '/optimize/flight' : '/optimize/hotel';
    const finalReturn = returnDate.length === 10 ? returnDate : null;

    const requestBody = mode === 'flight' 
      ? {
          origin: origin,
          destination: destination,
          date: date,
          return_date: finalReturn,
          is_rent_day: isRentDay, 
        }
      : {
          city_code: origin, // For Hotels, "Origin" input acts as the City selector
          date: date,
          return_date: finalReturn,
          is_rent_day: isRentDay,
        };

    try {
      const response = await fetch(`${API_URL_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const data = await response.json();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      setResult(data);
    } catch (error) {
      console.error(error);
      showAlert("Connection Error", "Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.replace('/')} 
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Text style={styles.backText}>← EXIT ENGINE</Text>
        </TouchableOpacity>
        
        <Text style={styles.brandTitle}>
          POINTPILOT <Text style={styles.brandSubtitle}>TRANSFER LAB</Text>
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {advisory && (
          <View style={[styles.advisoryContainer, { marginBottom: 10 }]}>
            <View style={[styles.advisoryContent, { borderColor: COLORS.blue }]}>
              <View style={[styles.advisoryDot, { backgroundColor: COLORS.blue }]} />
              <Text style={[styles.advisoryText, { color: COLORS.blue }]}>{advisory}</Text>
            </View>
          </View>
        )}

        <View style={styles.modeContainer}>
          {['flight', 'hotel'].map((m) => (
            <TouchableOpacity key={m} onPress={() => {setMode(m); setResult(null);}} style={[styles.modeButton, mode === m && styles.modeButtonActive]}>
              <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m.toUpperCase()}S</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.sectionLabel}>OPTIMIZATION PARAMETERS</Text>
          
          {/* LOCATION SELECTORS (TRIGGER MODALS) */}
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.inputWrapper} onPress={() => openSelection('origin')}>
              <Text style={styles.inputLabel}>{mode === 'flight' ? 'FROM' : 'CITY'}</Text>
              <Text style={styles.largeInput}>{origin}</Text>
              <Text style={styles.subInputLabel}>Tap to Change</Text>
            </TouchableOpacity>

            <View style={styles.verticalDivider} />

            <TouchableOpacity 
              style={styles.inputWrapper} 
              onPress={() => mode === 'flight' && openSelection('destination')}
              disabled={mode === 'hotel'}
            >
              <Text style={styles.inputLabel}>{mode === 'flight' ? 'TO' : 'ANALYSIS'}</Text>
              {mode === 'flight' ? (
                <>
                  <Text style={[styles.largeInput, { color: COLORS.blue }]}>{destination}</Text>
                  <Text style={styles.subInputLabel}>Tap to Change</Text>
                </>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.largeInput, { fontSize: 20, color: COLORS.blue }]}>MULTI</Text>
                  <Text style={[styles.largeInput, { fontSize: 10, color: COLORS.textDim }]}>PARTNER</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* DATES */}
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
               <Text style={styles.inputLabel}>
                 {mode === 'flight' ? 'DEPARTURE' : 'CHECK-IN'}
               </Text>
               <TextInput 
                 value={date} 
                 onChangeText={handleDateChange} 
                 style={[styles.largeInput, { fontSize: 20 }]} 
                 placeholder="YYYY-MM-DD" 
                 placeholderTextColor="#333" 
                 keyboardType="numeric"
                 maxLength={10}
               />
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.inputWrapper}>
               <Text style={styles.inputLabel}>
                 {mode === 'flight' ? 'RETURN' : 'CHECK-OUT'}
               </Text>
               <TextInput 
                 value={returnDate} 
                 onChangeText={handleReturnDateChange} 
                 style={[styles.largeInput, { fontSize: 20, color: returnDate ? '#FFF' : '#333' }]} 
                 placeholder="OPTIONAL" 
                 placeholderTextColor="#333" 
                 keyboardType="numeric"
                 maxLength={10}
               />
            </View>
          </View>

          <Text style={[styles.helperText, { textAlign: 'center', marginBottom: 24, marginTop: -10 }]}>
             {date.length === 10 && ['06','07','08','12'].includes(date.split('-')[1]) 
               ? "Detected Peak Season Pricing" 
               : "Detected Standard Season Pricing"}
          </Text>

          <TouchableOpacity style={styles.runButton} onPress={handleOptimize} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.runButtonText}>ANALYZE VALUE</Text>}
          </TouchableOpacity>
        </View>

        {result && (
          <Animated.View style={[styles.resultsWrapper, { opacity: fadeAnim }]}>
            <View style={styles.transparencyCard}>
              <Text style={styles.transparencyTitle}>
                {mode === 'hotel' && result?.market_baseline?.property 
                  ? `ACCELERATOR: ${result.market_baseline.property.toUpperCase()}` 
                  : "MARKET VALUE ANALYSIS"}
              </Text>
              <View style={styles.comparisonScale}>
                <View style={styles.scaleItem}>
                  <Text style={styles.scaleLabel}>LIVE CASH PRICE</Text>
                  <Text style={[styles.scaleValue, { color: COLORS.green }]}>
                    ${result.market_baseline.cash_price}
                  </Text>
                  <Text style={styles.subScaleLabel}>Market Rate</Text>
                </View>
                <View style={styles.scaleDivider} />
                <View style={styles.scaleItem}>
                  <Text style={[styles.scaleLabel, {color: COLORS.blue}]}>BEST REDEMPTION</Text>
                  <Text style={[styles.scaleValue, {color: COLORS.blue}]}>{result.best_option.cpp}¢</Text>
                  <Text style={styles.subScaleLabel}>Per Point</Text>
                </View>
              </View>
              <View style={styles.savingsBanner}>
                <Text style={styles.savingsText}>
                  ACCELERATING YOUR VALUE BY <Text style={{fontWeight: '900'}}>${result.best_option.cash_savings}</Text>
                </Text>
              </View>
            </View>

            <Text style={styles.matrixTitle}>OPTIMIZED PARTNER LIST</Text>
            {result.results.map((item: any, index: number) => (
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

      {/* --- SELECTION MODAL --- */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {activeField === 'origin' ? (mode === 'flight' ? 'Origin' : 'City') : 'Destination'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
            
            <TextInput 
              style={styles.searchBar}
              placeholder="Search (e.g. Tokyo, JFK, London)"
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />

            <FlatList 
              data={getFilteredList()}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.listItem} onPress={() => selectLocation(item.code)}>
                  <Text style={styles.listCode}>{item.code}</Text>
                  <Text style={styles.listName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, ...Platform.select({ web: { height: '100vh', width: '100vw' }, default: {} }) },
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
  subInputLabel: { color: COLORS.textDim, fontSize: 10, marginTop: 4 }, // NEW STYLE
  helperText: { color: COLORS.textDim, fontSize: 10, marginTop: 8 },
  advisoryContainer: { alignItems: 'center', marginBottom: 20 },
  advisoryContent: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.4)', shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 10 },
  advisoryDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.gold, marginRight: 10 },
  advisoryText: { color: COLORS.gold, fontWeight: '700', fontSize: 10, letterSpacing: 1, fontFamily: MONO },
  runButton: { backgroundColor: COLORS.blue, paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  runButtonText: { color: '#000', fontWeight: '900', fontSize: 11, letterSpacing: 1.5 },
  resultsWrapper: {},
  transparencyCard: { backgroundColor: '#0D0D0D', borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: '#222' },
  transparencyTitle: { color: '#444', fontSize: 9, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 20 },
  comparisonScale: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  scaleItem: { alignItems: 'center' },
  scaleLabel: { color: '#444', fontSize: 8, fontWeight: '800', marginBottom: 4 },
  subScaleLabel: { color: '#444', fontSize: 9, marginTop: 4 },
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

  // --- MODAL STYLES ---
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111', height: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  closeText: { color: COLORS.blue, fontSize: 16, fontWeight: '600' },
  searchBar: { backgroundColor: '#222', color: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 20 },
  listItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#222', flexDirection: 'row', alignItems: 'center', gap: 16 },
  listCode: { color: COLORS.blue, fontSize: 18, fontWeight: '900', fontFamily: MONO, width: 50 },
  listName: { color: '#FFF', fontSize: 16, fontWeight: '500' },
});