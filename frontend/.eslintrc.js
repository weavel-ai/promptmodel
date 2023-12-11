module.exports = {
  extends: ["next", "turbo", "prettier"],
  rules: {
    "@next/next/no-html-link-for-pages": 1,
    "react-hooks/exhaustive-deps": 1, // TODO: Disable this in the future and fix all warnings
  },
  parserOptions: {
    babelOptions: {
      presets: [require.resolve("next/babel")],
    },
  },
};
