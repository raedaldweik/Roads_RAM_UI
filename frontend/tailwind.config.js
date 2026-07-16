/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          // Keep the same class names (bg-brand-gold, bg-brand-navy) so no components need to change
          gold: '#0766d1',          // SAS blue — class names kept for minimal churn
          'gold-light': '#1f7ce6',
          navy: '#0a1628',          // deep navy
          'navy-deep': '#060d18',
          'navy-mid': '#243447',
          cream: '#f7f3ec',
          maroon: '#032954',        // alias (SAS midnight navy)
        }
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
