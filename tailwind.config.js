/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"IBM Plex Mono"', "Cascadia Code", "Consolas", "Monaco", "Courier New", "monospace"],
      },
      boxShadow: {
        bar: "var(--shadow-bar)",
        dropdown: "var(--shadow-dropdown)",
        modal: "var(--shadow-modal)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "200ms",
      },
      colors: {
        // Cursor/VS Code–style workbench colors (theme via CSS vars in index.css)
        cursor: {
          title: "var(--cursor-title)",
          sidebar: "var(--cursor-sidebar)",
          editor: "var(--cursor-editor)",
          border: "var(--cursor-border)",
          "panel-border": "var(--cursor-panel-border)",
          hover: "var(--cursor-hover)",
          selected: "var(--cursor-selected)",
          "text": "var(--cursor-text)",
          "text-muted": "var(--cursor-text-muted)",
          accent: "var(--cursor-accent)",
          dropdown: "var(--cursor-dropdown)",
        },
        orange: {
          DEFAULT: "#ff914d",
          50: "#fff3e6",
          100: "#ffe6cc",
          200: "#ffcc99",
          300: "#ffb366",
          400: "#ff9933",
          500: "#ff914d",
          600: "#e67a44",
          700: "#cc633a",
          800: "#b34d31",
          900: "#993627"
        }
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}
