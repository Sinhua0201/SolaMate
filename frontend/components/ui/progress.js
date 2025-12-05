import * as React from "react"

const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    className={`relative h-4 w-full overflow-hidden rounded-full bg-neutral-800 ${className || ''}`}
    {...props}
  >
    <div
      className="h-full w-full flex-1 bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-500"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </div>
))
Progress.displayName = "Progress"

export { Progress }
