/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        edudown: {
          blue: '#1e40af',
          teal: '#0d9488',
          orange: '#f97316',
        },
      },
    },
  },
  plugins: [],
}
