/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Roboto', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        custom: {
          primary: '#cf142b', // Primary red
          dark: '#090b0c', // Dark text
          secondary: '#778f9c', // Secondary background
          white: '#ffffff', // White background
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
