import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';

const { height, width } = Dimensions.get('window');

// --- DATA ---
const SECTIONS = [
  {
    id: 1,
    title: "EARN ON RENT",
    text: "Transform your largest monthly\nexpense into valuable rewards.",
  },
  {
    id: 2,
    title: "TRAVEL FREELY",
    text: "Transfer your points 1:1 to\nthe world's top airlines and hotels.",
  },
  // {
  //   id: 3,
  //   title: "THE TRANSFER LAB",
  //   text: "A real-time valuation engine\nto maximize every single point.",
  // }
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
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isWhiteMode, setIsWhiteMode] = useState(false);

  const handleScroll = (e) => {
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      { useNativeDriver: false }
    )(e);

    const yOffset = e.nativeEvent.contentOffset.y;
    // Switch status bar to dark text when we are deep in the 4th section
    if (yOffset > height * 2.5) {
      if (!isWhiteMode) setIsWhiteMode(true);
    } else {
      if (isWhiteMode) setIsWhiteMode(false);
    }
  };

  // --- ANIMATIONS ---

  // 1. HERO MAP
  const heroMapOpacity = scrollY.interpolate({
    inputRange: [0, height],
    outputRange: [1, 0], 
    extrapolate: 'clamp',
  });

  // 2. Video 1 (Rent)
  const video1Opacity = scrollY.interpolate({
    inputRange: [0, height, height * 2],
    outputRange: [0, 1, 0], 
    extrapolate: 'clamp',
  });

  // 3. Video 2 (Travel)
  const video2Opacity = scrollY.interpolate({
    inputRange: [height, height * 2, height * 3],
    outputRange: [0, 1, 0], 
    extrapolate: 'clamp',
  });

  // 4. Video 3 (Lab)
  // const video3Opacity = scrollY.interpolate({
  //   inputRange: [height * 2, height * 3, height * 4],
  //   outputRange: [0, 1, 0], 
  //   extrapolate: 'clamp',
  // });

  // 5. WHITE BACKGROUND FADE
  const whiteBgOpacity = scrollY.interpolate({
    inputRange: [height * 2, height * 2.8],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isWhiteMode ? "dark-content" : "light-content"} />

      {/* A. BLACK BACKGROUND (Base) */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />

      {/* B. HERO MAP VIDEO (Bottom Layer) */}
      <Animated.View style={[styles.videoContainer, { opacity: heroMapOpacity }]}>
        <Video
          style={styles.video}
          source={require('../assets/videos/transfer2.mp4')} 
          resizeMode={ResizeMode.COVER}
          shouldPlay isLooping isMuted
        />
        <View style={styles.videoOverlay} />
      </Animated.View>

      {/* C. OTHER VIDEOS */}
      <Animated.View style={[styles.videoContainer, { opacity: video1Opacity }]}>
        <Video
          style={styles.video}
          source={{ uri: 'https://cdn.pixabay.com/video/2020/05/25/40158-424072671_large.mp4' }} 
          resizeMode={ResizeMode.COVER}
          shouldPlay isLooping isMuted
        />
        <View style={styles.videoOverlay} />
      </Animated.View>

      <Animated.View style={[styles.videoContainer, { opacity: video2Opacity }]}>
        <Video
          style={styles.video}
          source={require('../assets/videos/travel.mp4')}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay isLooping isMuted
        />
        <View style={styles.videoOverlay} />
      </Animated.View>

      {/* <Animated.View style={[styles.videoContainer, { opacity: video3Opacity }]}>
        <Video
          key="video-3-final"
          style={[styles.video, Platform.OS === 'web' ? { objectFit: 'contain' } : undefined]} 
          source={require('../assets/videos/transfer2.mp4')}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay isLooping isMuted
        />
        <View style={styles.videoOverlay} />
      </Animated.View> */}

      {/* D. WHITE OVERLAY */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { backgroundColor: '#FFFFFF', opacity: whiteBgOpacity }
        ]} 
      />
      
      {/* E. SCROLL CONTENT */}
      <Animated.ScrollView
        pagingEnabled
        scrollEventThrottle={16}
        onScroll={handleScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* PAGE 0: HERO */}
        <View style={styles.sectionContainer}>
          <Text style={styles.heroTitle}>POINTPILOT</Text>
          <View style={styles.heroSubtitleContainer}>
            <Text style={styles.heroSub}>TRANSFER</Text>
            <View style={styles.labBadge}>
               <Text style={styles.labText}>LAB</Text>
            </View>
          </View>
          
          {/* --- NEW TEXT ADDED HERE --- */}
          <Text style={styles.heroDescription}>
            A real-time valuation engine{'\n'}to maximize every single point.
          </Text>

          <Text style={styles.builtBy}>ENGINEERED BY ATHARV</Text>
          <View style={styles.scrollIndicatorContainer}>
             <Text style={styles.scrollIndicator}>SCROLL TO EXPLORE</Text>
             <View style={styles.scrollLine} />
          </View>
        </View>

        {/* PAGES 1, 2, 3 */}
        {SECTIONS.map((item, index) => (
          <FadeSection key={item.id} item={item} scrollY={scrollY} index={index + 1} />
        ))}

        {/* PAGE 4: FINAL BRANDING */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity 
            style={styles.contentBox}
            onPress={() => router.push('/transfer-lab')}
          >
            <Text style={styles.finalBrandText}>
              This is where {'\n'}<Text style={{color: '#aad2fb'}}>PointPilot</Text> comes in.
            </Text>
            <Text style={styles.clickHint}>( Tap to Launch )</Text>
          </TouchableOpacity>
        </View>

      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  
  // Video Styles
  videoContainer: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  video: { width: '100%', height: '100%', ...Platform.select({
    web: { 
      // This keeps the video filling the screen on laptops
      objectFit: 'cover' 
    },
    default: { 
      // This ensures the video isn't cropped on mobile screens
      resizeMode: 'contain' 
    }
  }) },
  videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  
  // Section Layout
  sectionContainer: { 
    height: height, 
    width: width, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 20 
  },

  // Typography
  heroTitle: { color: '#FFFFFF', fontSize: 54, fontWeight: '900', letterSpacing: -2, marginBottom: -5, fontFamily: Platform.OS === 'ios' ? 'Arial Rounded MT Bold' : 'System', textAlign: 'center' },
  heroSubtitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroSub: { color: '#FFFFFF', fontSize: 24, fontWeight: '300', letterSpacing: 6 },
  labBadge: { backgroundColor: '#aad2fb', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  labText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  builtBy: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 48, textTransform: 'uppercase' }, // Increased marginTop slightly
  
  // NEW STYLE FOR THE DESCRIPTION
  heroDescription: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
    maxWidth: 320,
    lineHeight: 24,
  },

  scrollIndicatorContainer: { position: 'absolute', bottom: 40, alignItems: 'center', gap: 8 },
  scrollIndicator: { color: '#444', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  scrollLine: { width: 1, height: 40, backgroundColor: '#333' },
  
  // Story Text
  sectionTitle: { color: '#aad2fb', fontSize: 12, fontWeight: '800', letterSpacing: 3, marginBottom: 24, textTransform: 'uppercase' },
  sectionText: { fontSize: 36, fontWeight: '600', textAlign: 'center', lineHeight: 46, maxWidth: 600 },
  
  // Section 4 Elements
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
  }
});