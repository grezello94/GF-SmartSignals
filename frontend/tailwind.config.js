/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["\"JetBrains Mono\"", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "monospace"],
      },
      colors: {
        panel: "#0b1118",
        signal: {
          blue: "#38bdf8",
          green: "#34d399",
          red: "#f87171",
          amber: "#facc15",
        },
      },
      boxShadow: {
        glow: "0 0 30px rgba(56, 189, 248, 0.35)",
      },
    },
  },
  plugins: [],
}
