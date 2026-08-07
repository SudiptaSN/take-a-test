import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { 
    extend: {
      fontFamily: {
        bengali: ['var(--font-bengali)', 'sans-serif'],
        sans: ['var(--font-inter)', 'var(--font-bengali)', 'sans-serif'],
      }
    } 
  },
  plugins: [require('@tailwindcss/typography')],
};
export default config;
