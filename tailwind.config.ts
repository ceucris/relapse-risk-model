import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#142033",
        mist: "#e7eef5",
        teal: "#1fa7a0",
        accent: "#2f6fed",
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["Figtree", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
