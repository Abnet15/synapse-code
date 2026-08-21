/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#0a0e14',
          900: '#0f1420',
          800: '#161b2c',
          700: '#1f2637',
          600: '#2a3348',
        },
      },
    },
  },
  plugins: [],
};
