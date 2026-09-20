/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand & Accent
        'frog-green': '#4CAF50',
        'frog-green-secondary': '#66BB6A',
        'lily-pad': '#81C784',
        'golden-xp': '#FFD54F',
        'coral-alert': '#FF7043',
        'sky-blue': '#42A5F5',

        // Backgrounds & Surfaces
        'pond-dark': '#1A2332',
        'pond-light': '#F5F7FA',
        'surface-dark': '#243447',
        'surface-light': '#FFFFFF',
        'surface-card': '#1f2c3d',

        // Typography Colors
        'text-primary-dark': '#E8ECF0',
        'text-primary-light': '#1A2332',
        'text-muted-dark': '#8A9BB5',
        'text-muted-light': '#6B7C93',

        // Semantic
        success: '#4CAF50',
        warning: '#FFD54F',
        error: '#FF7043',
        info: '#42A5F5',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      // React Native/Yoga layout engine operates in density-independent pixels (dp),
      // so rem values from @posture-check/shared are mapped to explicit pixel equivalents
      // to guarantee exact cross-platform sizing consistency (e.g. touch-target = 44px).
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '3.5': '14px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '9': '36px',
        '10': '40px',
        '11': '44px', // Minimum touch target
        '12': '48px',
        '14': '56px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        'touch-target': '44px',
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
        full: '9999px',
      },
      minHeight: {
        'touch-target': '44px',
      },
      minWidth: {
        'touch-target': '44px',
      },
    },
  },
  plugins: [],
};
