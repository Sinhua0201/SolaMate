import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles - Liquid Glass WHITE THEME
        "h-10 w-full min-w-0 rounded-xl px-4 py-2 text-base md:text-sm",
        "bg-white/80 backdrop-blur-sm",
        "border border-black/10",
        "text-neutral-800 placeholder:text-neutral-400",
        "shadow-sm",
        // Transitions
        "transition-all duration-300 ease-out",
        "outline-none",
        // Focus state - glass glow
        "focus:bg-white focus:border-purple-400",
        "focus:ring-2 focus:ring-purple-500/20",
        "focus:shadow-[0_0_20px_rgba(147,51,234,0.1)]",
        // File input
        "file:text-neutral-700 file:inline-flex file:h-7 file:border-0 file:bg-purple-100 file:rounded-lg file:px-3 file:text-sm file:font-medium file:mr-3",
        // Selection
        "selection:bg-purple-500/30 selection:text-neutral-800",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid
        "aria-invalid:border-red-500/50 aria-invalid:ring-red-500/20",
        className
      )}
      {...props} />
  );
}

export { Input }
