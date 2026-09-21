import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { RibbitState, MascotSize } from '@posture-check/shared';
import { RIBBIT_SIZE_MAP, RIBBIT_STATE_DESCRIPTIONS } from '@posture-check/shared';
import { RIBBIT_SVG_STRINGS } from './ribbit-svg-strings';

export interface RibbitMascotProps {
  /** The current emotional state of Ribbit */
  state: RibbitState;
  /** Size preset ('sm' | 'md' | 'lg' | 'xl') or exact pixel size */
  size?: MascotSize;
  /** Additional styling */
  style?: StyleProp<ViewStyle>;
  /** Tailwind className for NativeWind */
  className?: string;
  /** Whether to apply the subtle idle breathing animation (default: true) */
  showBreathing?: boolean;
  /** Custom accessible alt / description text */
  alt?: string;
}

export const RibbitMascot: React.FC<RibbitMascotProps> = ({
  state = 'idle',
  size = 'md',
  style,
  className = '',
  showBreathing = true,
  alt,
}) => {
  const pixelSize = typeof size === 'number' ? size : RIBBIT_SIZE_MAP[size] ?? 96;
  const svgXml = RIBBIT_SVG_STRINGS[state] || RIBBIT_SVG_STRINGS.idle;
  const accessibilityLabel = alt || `Ribbit the Frog (${state}): ${RIBBIT_STATE_DESCRIPTIONS[state] || state}`;

  // Breathing animation (hardware-accelerated on native, JS/CSS on web)
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (!showBreathing) {
      scaleAnim.setValue(1);
      return;
    }

    const breathingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.035,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver,
        }),
      ])
    );

    breathingLoop.start();

    return () => {
      breathingLoop.stop();
    };
  }, [showBreathing, scaleAnim, useNativeDriver]);

  return (
    <Animated.View
      style={[
        {
          width: pixelSize,
          height: pixelSize,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
      className={className}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {Platform.OS === 'web' ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          dangerouslySetInnerHTML={{ __html: svgXml }}
        />
      ) : (
        <SvgXml
          xml={svgXml}
          width={pixelSize}
          height={pixelSize}
        />
      )}
    </Animated.View>
  );
};

export default RibbitMascot;

