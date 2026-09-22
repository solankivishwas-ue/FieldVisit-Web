/** @type {import('tailwindcss').Config} */
export default {
  // "class" strategy: dark mode is enabled by adding the `dark` class to <html>.
  // ThemeContext.tsx manages that class and persists the preference to localStorage.
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

