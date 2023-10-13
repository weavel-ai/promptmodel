/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  daisyui: {
    themes: [
      {
        light: {
          "color-scheme": "light",
          primary: "#6320EE",
          "primary-content": "#ffffff",
          secondary: "#8075FF",
          "secondary-content": "#ffffff",
          accent: "#37cdbe",
          "accent-content": "#161E28",
          neutral: "#3d4451",
          "neutral-content": "#ffffff",
          "base-100": "#ffffff",
          "base-200": "#F2F2F2",
          "base-300": "#ffffff",
          "base-content": "#121921",
        },
      },
      {
        dark: {
          "color-scheme": "dark",
          primary: "#6320EE",
          "primary-content": "#121921",
          secondary: "#8075FF",
          "secondary-content": "#ffffff",
          accent: "#96f2d7",
          "accent-content": "#ffffff",
          neutral: "#141814",
          "neutral-focus": "#121921",
          "neutral-content": "#B8B9BC",
          "base-100": "#161827",
          // "base-100": "#1D2034",
          // "base-100": "#111",
          "base-200": "#21243A",
          "base-300": "#3D454E",
          "base-content": "#f2f2f2",
        },
      },
    ],
  },
  plugins: [
    require("tailwind-scrollbar-hide"),
    require("@tailwindcss/typography"),
    require("daisyui"),
  ],
};
