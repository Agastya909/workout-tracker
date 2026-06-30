export const colors = {
  // Base — pure monochrome
  bg: {
    base: "bg-black",
    surface: "bg-zinc-950",
    elevated: "bg-zinc-900",
    overlay: "bg-zinc-800",
    input: "bg-zinc-900",
  },

  border: {
    default: "border-zinc-800",
    muted: "border-zinc-900",
    strong: "border-zinc-700",
    focus: "border-zinc-500",
  },

  text: {
    primary: "text-white",
    secondary: "text-zinc-400",
    muted: "text-zinc-600",
    inverse: "text-black",
  },

  // Semantic accent colors
  accent: {
    // Primary action (white on black)
    primary: "bg-white text-black hover:bg-zinc-200",
    primaryText: "text-white",

    // Success / PR / completed
    green: {
      bg: "bg-emerald-950/60",
      border: "border-emerald-800",
      text: "text-emerald-400",
      badge: "bg-emerald-900 text-emerald-300",
    },

    // Warning / moderate / in-progress
    yellow: {
      bg: "bg-yellow-950/60",
      border: "border-yellow-800",
      text: "text-yellow-400",
      badge: "bg-yellow-900 text-yellow-300",
    },

    // Danger / delete / missed
    red: {
      bg: "bg-red-950/60",
      border: "border-red-800",
      text: "text-red-400",
      badge: "bg-red-900 text-red-300",
    },

    // Info / neutral highlight
    blue: {
      bg: "bg-blue-950/60",
      border: "border-blue-800",
      text: "text-blue-400",
      badge: "bg-blue-900 text-blue-300",
    },

    // Active workout / energy
    orange: {
      bg: "bg-orange-950/60",
      border: "border-orange-800",
      text: "text-orange-400",
      badge: "bg-orange-900 text-orange-300",
    },
  },

  // Interactive states
  interactive: {
    base: "transition-colors duration-150",
    hover: "hover:bg-zinc-800",
    hoverBorder: "hover:border-zinc-600",
    active: "active:bg-zinc-700",
  },
} as const;
