import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';

const { height, width } = Dimensions.get('window');

// --- DATA ---
const SECTIONS = [
  {
    id: 1,
    title: "MAXIMIZE & OPTIMIZE",
    text: "Maximize Rent Day rewards and\ninstantly identify high-value partners.",
  }
];

const FadeSection = ({ item, scrollY, index }) => {
  const inputRange = [(index - 1) * height, index * height, (index + 1) * height];
  
  const opacity = scrollY.interpolate({
    inputRange,
    outputRange: [0, 1, 0], 
    extrapolate: 'clamp',
  });

  const translateY = scrollY.interpolate({
    inputRange,
    outputRange: [40, 0, -40],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.sectionContainer}>
      <Animated.View style={{ opacity, transform: [{ translateY }], alignItems: 'center' }}>
        <Text style={styles.sectionTitle}>{item.title}</Text>
        <Text style={[styles.sectionText, { color: '#FFFFFF' }]}>
          {item.text}
        </Text>
      </Animated.View>
    </View>
  );
};

export default function LandingPage() {
  const router = useRouter();
  
  // --- DEV MODE STATE ---
  const [devMode, setDevMode] = useState(false);

  // 1. ANIMATION VALUES
  const scrollY = useRef(new Animated.Value(0)).current;
  const textEntrance = useRef(new Animated.Value(0)).current; 
  const mapEntrance = useRef(new Animated.Value(0)).current;  
  
  const [isWhiteMode, setIsWhiteMode] = useState(false);

  useEffect(() => {
    // ENTRANCE SEQUENCE
    Animated.stagger(500, [ 
      Animated.timing(textEntrance, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false, 
      }),
      Animated.timing(mapEntrance, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false, 
      }),
    ]).start();
  }, []);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false } 
  );

  const handleLaunch = () => {
    // PASS THE DEV MODE STATE TO THE NEXT SCREEN
    router.push({ 
      pathname: '/transfer-lab', 
      params: { rentDayOverride: devMode ? 'true' : 'false' } 
    });
  };

  // --- INTERPOLATIONS ---
  const mapScrollOpacity = scrollY.interpolate({
    inputRange: [0, height],
    outputRange: [1, 0], 
    extrapolate: 'clamp',
  });

  const finalMapOpacity = Animated.multiply(mapScrollOpacity, mapEntrance);

  const video1Opacity = scrollY.interpolate({
    inputRange: [0, height, height * 2],
    outputRange: [0, 1, 0], 
    extrapolate: 'clamp',
  });

  const whiteBgOpacity = scrollY.interpolate({
    inputRange: [height, height * 1.8],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      if (value > height * 1.5) {
        if (!isWhiteMode) setIsWhiteMode(true);
      } else {
        if (isWhiteMode) setIsWhiteMode(false);
      }
    });
    return () => scrollY.removeListener(listener);
  }, [isWhiteMode]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isWhiteMode ? "dark-content" : "light-content"} />

      {/* BACKGROUND BASE */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />

      {/* 1. HERO MAP */}
      <Animated.View style={[styles.videoContainer, { opacity: finalMapOpacity }]}>
        <Video
          style={styles.video}
          source={{ uri: 'https://cdn.pixabay.com/video/2021/07/28/83084-580798606_large.mp4' }} 
          resizeMode={ResizeMode.COVER}
          shouldPlay isLooping isMuted
        />
        <View style={styles.videoOverlay} />
      </Animated.View>

      {/* 2. MAIN CONTENT VIDEO */}
      <Animated.View style={[styles.videoContainer, { opacity: video1Opacity }]}>
        <Video
          style={styles.video}
          source={require('../assets/videos/transfer2.mp4')} 
          resizeMode={ResizeMode.COVER}
          shouldPlay isLooping isMuted
        />
        <View style={styles.videoOverlay} />
      </Animated.View>

      {/* 3. WHITE OVERLAY */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { backgroundColor: '#FFFFFF', opacity: whiteBgOpacity }
        ]} 
      />
      
      {/* 4. SCROLLABLE CONTENT */}
      <Animated.ScrollView
        pagingEnabled
        scrollEventThrottle={16}
        onScroll={handleScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO SECTION */}
        <View style={styles.sectionContainer}>
          <Animated.View style={{ opacity: textEntrance, alignItems: 'center', width: '100%' }}>
            <Text style={styles.heroTitle}>POINTPILOT</Text>
            <View style={styles.heroSubtitleContainer}>
              <Text style={styles.heroSub}>TRANSFER</Text>
              <View style={styles.labBadge}>
                <Text style={styles.labText}>LAB</Text>
              </View>
            </View>
            
            <Text style={styles.heroDescription}>
              A real-time valuation engine{'\n'}to maximize every single point.
            </Text>

            <Text style={styles.builtBy}>BUILT BY ATHARV</Text>
            <View style={styles.scrollIndicatorContainer}>
              <Text style={styles.scrollIndicator}>SCROLL TO EXPLORE</Text>
              <View style={styles.scrollLine} />
            </View>
          </Animated.View>
        </View>

        {/* COMBINED INFO SECTION */}
        {SECTIONS.map((item, index) => (
          <FadeSection key={item.id} item={item} scrollY={scrollY} index={index + 1} />
        ))}

        {/* FINAL CTA SECTION (WITH DEV MODE) */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity 
            style={styles.contentBox}
            onPress={handleLaunch}
          >
            <Text style={styles.finalBrandText}>
              This is where {'\n'}<Text style={{color: '#aad2fb'}}>PointPilot</Text> comes in.
            </Text>
            <Text style={styles.clickHint}>( Tap to Launch )</Text>
          </TouchableOpacity>

          {/* --- DEV MODE TOGGLE --- */}
          <TouchableOpacity 
            style={[styles.devToggle, devMode && styles.devToggleActive]} 
            onPress={() => setDevMode(!devMode)}
          >
            <Text style={[styles.devText, devMode && { color: '#000' }]}>
              {devMode ? "🛠️ DEV MODE: RENT DAY FORCED" : "🛠️ ENABLE DEV MODE"}
            </Text>
          </TouchableOpacity>
        </View>

      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  
  videoContainer: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  video: { width: '100%', height: '100%', ...Platform.select({
    web: { objectFit: 'cover' },
    default: { resizeMode: 'contain' }
  }) },
  videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  
  sectionContainer: { 
    height: height, 
    width: width, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 20 
  },

  heroTitle: { color: '#FFFFFF', fontSize: 54, fontWeight: '900', letterSpacing: -2, marginBottom: -5, fontFamily: Platform.OS === 'ios' ? 'Arial Rounded MT Bold' : 'System', textAlign: 'center' },
  heroSubtitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroSub: { color: '#FFFFFF', fontSize: 24, fontWeight: '300', letterSpacing: 6 },
  labBadge: { backgroundColor: '#aad2fb', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  labText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  builtBy: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 48, textTransform: 'uppercase' }, 
  
  heroDescription: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
    maxWidth: 320,
    lineHeight: 24,
  },

  scrollIndicatorContainer: { position: 'absolute', bottom: 40, alignItems: 'center', gap: 8, width: '100%' },
  scrollIndicator: { color: '#444', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  scrollLine: { width: 1, height: 40, backgroundColor: '#333' },
  
  sectionTitle: { color: '#aad2fb', fontSize: 12, fontWeight: '800', letterSpacing: 3, marginBottom: 24, textTransform: 'uppercase' },
  sectionText: { fontSize: 36, fontWeight: '600', textAlign: 'center', lineHeight: 46, maxWidth: 600 },
  
  contentBox: { alignItems: 'center', padding: 10 },
  finalBrandText: {
    color: '#000000', 
    fontSize: 72,      
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 76,   
    letterSpacing: -2, 
  },
  clickHint: {
    marginTop: 30,
    color: '#999',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // DEV MODE STYLES
  devToggle: {
    position: 'absolute',
    bottom: 40,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  devToggleActive: {
    backgroundColor: '#aad2fb',
    borderColor: '#aad2fb',
  },
  devText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
  }
});