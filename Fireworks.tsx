import React, { useEffect, useRef } from 'react';
import { View, Animated, useWindowDimensions } from 'react-native';

const COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C084FC', '#FF9F43', '#FF6BFF'];
const NUM_BURSTS = 10;
const PARTICLES_PER_BURST = 10;

interface ParticleConfig {
  dx: number;
  dy: number;
  color: string;
  size: number;
  burstXRatio: number;
  burstYRatio: number;
  delay: number;
}

interface Particle extends ParticleConfig {
  progress: Animated.Value;
}

interface FireworksProps {
  visible: boolean;
}

// Pre-compute ratios (0–1) once — converted to pixels at render time
const BURST_CONFIGS: ParticleConfig[] = Array.from({ length: NUM_BURSTS }, (_, b) => {
  const burstXRatio = 0.1 + (b % 3) * 0.35 + Math.random() * 0.1;
  const burstYRatio = 0.1 + Math.floor(b / 3) * 0.4 + Math.random() * 0.15;
  const delay = b * 250;
  return Array.from({ length: PARTICLES_PER_BURST }, (_, p) => {
    const angle = (p / PARTICLES_PER_BURST) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
    const radius = 90 + Math.random() * 80;
    return {
      dx: Math.cos(angle) * radius,
      dy: Math.sin(angle) * radius,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 8 + Math.random() * 8,
      burstXRatio,
      burstYRatio,
      delay,
    };
  });
}).flat();

const Fireworks: React.FC<FireworksProps> = ({ visible }) => {
  const { width, height } = useWindowDimensions();

  const particles = useRef<Particle[]>(
    BURST_CONFIGS.map((cfg) => ({ ...cfg, progress: new Animated.Value(0) })),
  );

  useEffect(() => {
    if (!visible) return;

    particles.current.forEach((p) => p.progress.setValue(0));

    const animations = particles.current.map((p) =>
      Animated.sequence([
        Animated.delay(p.delay),
        Animated.timing(p.progress, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
      ]),
    );

    Animated.parallel(animations).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, width, height }}
      pointerEvents="none"
    >
      {particles.current.map((p, i) => {
        const translateX = p.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.dx],
        });
        const translateY = p.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.dy],
        });
        const opacity = p.progress.interpolate({
          inputRange: [0, 0.1, 0.6, 1],
          outputRange: [0, 1, 1, 0],
        });
        const scale = p.progress.interpolate({
          inputRange: [0, 0.15, 1],
          outputRange: [0, 1.2, 0.4],
        });

        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.burstXRatio * width,
              top: p.burstYRatio * height,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              opacity,
              transform: [{ translateX }, { translateY }, { scale }],
            }}
          />
        );
      })}
    </View>
  );
};

export default Fireworks;
