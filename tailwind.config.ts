import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        void: '#05070A',
        ink: '#0A0E14',
        electric: '#2E6BFF',
        cyan: '#22E1FF',
        violet: '#8B5CFF',
        purple: '#C46BFF',
        soft: '#E8EDF5',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        ultra: '0.35em',
      },
      animation: {
        'float-slow': 'float 8s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
        'pulse-glow': 'pulseGlow 2.6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%,100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
