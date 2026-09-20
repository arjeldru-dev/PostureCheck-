/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'frog-green': '#4CAF50',
        'frog-green-secondary': '#66BB6A',
        'lily-pad': '#81C784',
        'pond-dark': '#1A2332',
        'pond-light': '#F5F7FA',
        'golden-xp': '#FFD54F',
        'coral-alert': '#FF7043',
        'sky-blue': '#42A5F5',
        'surface-dark': '#243447',
        'surface-light': '#FFFFFF',
        'surface-card': '#1f2c3d',
        'text-primary-dark': '#E8ECF0',
        'text-primary-light': '#1A2332',
        'text-muted-dark': '#8A9BB5',
        'text-muted-light': '#6B7C93',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
