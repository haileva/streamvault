/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        // xl kicks in at 1280px — used for 3-col grids and 2-col form layouts
        'xl': '1280px',
        // 2xl for 1536px+ (ultra-wide monitors)
        '2xl': '1536px',
      },
      maxWidth: {
        '8xl': '1440px',
      },
    },
  },
  plugins: [],
}

