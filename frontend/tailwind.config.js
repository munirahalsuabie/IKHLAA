/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
      sans: [
    '-apple-system',        // iPhone & Mac (SF Pro)
    'BlinkMacSystemFont',   // Chrome on Mac
    '"Segoe UI"',           // Windows
    'Roboto',               // Android
    '"Tahoma"',             // Arabic fallback
    'sans-serif',
  ],
},

      colors: {
        // The Official Saudi Ministry/Absher Green
        absher: {
          DEFAULT: '#006C35', // Primary
          dark: '#00502F',    // Hover state
          light: '#22C55E'    // Success/Safe state
        },
        // Dashboard Backgrounds
        night: {
          900: '#0f172a', // Deep background
          800: '#1e293b', // Panels
        }
      },

      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'slide-down': 'slideDown 0.4s ease-out forwards',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
