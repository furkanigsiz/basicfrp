/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        amber: {
          200: '#fde68a',
          300: '#fcd34d',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
        },
        stone: {
          800: '#292524',
          900: '#1c1917',
        },
        emerald: {
          600: '#059669',
        },
        red: {
          200: '#fecaca',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        yellow: {
          200: '#fef08a',
          700: '#a16207',
          900: '#713f12',
        },
        emerald: {
          700: '#047857',
          900: '#064e3b',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}

