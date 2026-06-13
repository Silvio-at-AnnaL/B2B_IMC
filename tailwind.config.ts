import type { Config } from "tailwindcss";

// Corporate Identity ANNA-lyst (siehe Designvorgaben 4c)
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#428A44",  // CMYK 77/25/90/5
          blue: "#1D71B8",   // CMYK 85/50/0/0
          orange: "#EB9234", // CMYK 5/50/85/0
          red: "#D94235",    // CMYK 10/85/80/0
          gray: "#878787",   // CMYK 0/0/0/60
        },
      },
    },
  },
  plugins: [],
};
export default config;
