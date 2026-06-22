/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          // Keep the same class names (bg-brand-gold, bg-brand-navy) so no components need to change
          gold: '#b91c2c',          // RTA red — class names kept for minimal churn
          'gold-light': '#dc2626',
          navy: '#0a1628',          // deep navy
          'navy-deep': '#060d18',
          'navy-mid': '#243447',
          cream: '#f7f3ec',
          maroon: '#7f1d1d',        // alias (deep red)
        }
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
