import type { Config } from "tailwindcss";

// Colors resolve to CSS variables holding "R G B" channel triplets, so Tailwind's
// alpha utilities (e.g. bg-brand/15) keep working and the whole palette can be
// swapped at runtime by toggling the `dark` class on <html>.
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: v("--c-paper"),
        ink: { DEFAULT: v("--c-ink"), soft: v("--c-ink-soft") },
        brand: { DEFAULT: v("--c-brand"), soft: v("--c-brand-soft") },
        sage: v("--c-sage"),
        amber: v("--c-amber"),
        stone: v("--c-stone"),
        surface: v("--c-surface"),
        line: v("--c-line"),
        danger: v("--c-danger"),
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
      maxWidth: {
        content: "1024px",
      },
    },
  },
  plugins: [],
} satisfies Config;
