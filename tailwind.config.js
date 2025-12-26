/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sats-red': '#EE2536',
        'sats-purple': '#50284F',
        'sats-blue': '#30A9CE',
        'sats-green': '#418E3D',
        'sats-teal': '#4FC6B7',
        'sats-orange': '#FFA62B',
        'sats-yellow': '#FFDD15',
        'sats-navy': '#1F5575',
        'sats-gray': '#D5D7D7',
      },
    },
  },
  plugins: [],
}
