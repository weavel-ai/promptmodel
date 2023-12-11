/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        "base-100": "hsl(var(--base-100))",
        "base-200": "hsl(var(--base-200))",
        "base-300": "hsl(var(--base-300))",
        "base-content": "hsl(var(--base-content))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          content: "hsl(var(--primary-content))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          content: "hsl(var(--secondary-content))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          content: "hsl(var(--destructive-content))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          content: "hsl(var(--muted-content))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          content: "hsl(var(--accent-content))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          content: "hsl(var(--popover-content))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          content: "hsl(var(--card-content))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  daisyui: {},
  plugins: [
    require("tailwindcss-animate"),
    require("tailwind-scrollbar-hide"),
    require("@tailwindcss/typography"),
    require("daisyui"),
  ],
};
