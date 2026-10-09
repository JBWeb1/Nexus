import animate from "tailwindcss-animate";
const v = (n) => `hsl(var(--${n}) / <alpha-value>)`;
export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: {
      background: v("background"), foreground: v("foreground"), card: v("card"), "card-foreground": v("foreground"),
      muted: v("muted"), "muted-foreground": v("muted-foreground"), border: v("border"), input: v("input"), ring: v("ring"),
      primary: { DEFAULT: v("primary"), foreground: v("primary-foreground"), soft: v("primary-soft") },
      success: { DEFAULT: v("success"), soft: v("success-soft") }, warning: { DEFAULT: v("warning"), soft: v("warning-soft") },
      destructive: { DEFAULT: v("destructive"), foreground: v("primary-foreground"), soft: v("destructive-soft") },
      sidebar: { DEFAULT: v("sidebar"), foreground: v("sidebar-foreground"), muted: v("sidebar-muted"), accent: v("sidebar-accent") },
      // legacy names used across older screens, remapped onto the new palette
      paper: { DEFAULT: v("background"), light: v("card") }, ink: { DEFAULT: v("foreground"), soft: v("muted-foreground") },
      ledger: { DEFAULT: v("primary"), light: v("primary"), dark: v("primary") }, gold: { DEFAULT: v("warning"), light: v("warning") },
      brick: { DEFAULT: v("destructive"), light: v("destructive") }, hairline: v("border"), nexus: "#2F7BFF",
    },
    borderRadius: { lg: "0.75rem", md: "0.5rem", sm: "0.375rem" },
    fontFamily: { display: ['"Manrope Variable"', "system-ui", "sans-serif"], sans: ['"Manrope Variable"', "system-ui", "sans-serif"], mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"] },
    boxShadow: { card: "0 1px 2px hsl(222 47% 11% / 0.04), 0 1px 1px hsl(222 47% 11% / 0.03)", pop: "0 12px 32px -8px hsl(222 47% 11% / 0.18), 0 2px 6px hsl(222 47% 11% / 0.08)" },
  } }, plugins: [animate],
};
