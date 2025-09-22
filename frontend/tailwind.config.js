/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      "fontSize" : {
        "xm" : "0.75rem",
        "xxs" : "0.625rem"
      }
    },
  },
  plugins: [],
}

