/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bunker: "#081311",
        panel: "#0f1f1b",
        accent: "#00e6b8",
      },
    },
  },
  plugins: [],
};
