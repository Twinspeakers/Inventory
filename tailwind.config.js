const themedColor = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: themedColor("app"),
        ink: themedColor("ink"),
        muted: themedColor("muted"),
        graphite: themedColor("graphite"),
        sidebar: themedColor("sidebar"),
        "command-bar": themedColor("command-bar"),
        inspector: themedColor("inspector"),
        canvas: themedColor("canvas"),
        surface: themedColor("surface"),
        "surface-raised": themedColor("surface-raised"),
        line: themedColor("line"),
        preview: themedColor("preview"),
        forest: themedColor("forest"),
        copper: themedColor("copper"),
        steel: themedColor("steel"),
        violet: themedColor("violet"),
        amber: themedColor("amber"),
      },
      boxShadow: {
        soft: "0 12px 34px rgb(var(--color-graphite) / 0.24)",
      },
    },
  },
  plugins: [],
};
