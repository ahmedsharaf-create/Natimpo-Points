/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F1F2F5",
        card: "#FFFFFF",
        ink: "#1B1E27",
        inkfaint: "#6B7080",
        line: "#E2E4EA",
        brand: {
          DEFAULT: "#0F6E5C",
          dark: "#0B5548",
          light: "#E6F2EF",
        },
        gold: {
          DEFAULT: "#C99A2E",
          light: "#FBF1DC",
        },
        danger: {
          DEFAULT: "#C24545",
          light: "#FBEAEA",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        perf: "repeating-linear-gradient(to right, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
