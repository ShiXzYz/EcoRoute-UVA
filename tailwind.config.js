/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'uva-primary': '#232D4B',
        'uva-accent': '#00A3E0',
        'eco-green': '#10B981',
        'eco-amber': '#F59E0B',
        'eco-red': '#EF4444',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.5s ease-out',
      },
    },
  },
  plugins: [],
}
