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
        brown: "#785b4e",
        sage: "#7a816c",
        blush: "#d68d84",
        sand: "#cfbb9f",
        cream: "#f6efdf",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Source Sans 3", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
