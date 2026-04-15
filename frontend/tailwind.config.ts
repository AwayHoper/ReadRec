import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1B1F3B",
        sea: "#2F6F73",
        sand: "#F4EBD0",
        coral: "#F25F5C"
      }
    }
  },
  plugins: []
};

export default config;
