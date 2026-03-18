import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-[var(--aw-border)] bg-[var(--aw-card)] px-3 py-2 text-sm text-[var(--aw-text)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--aw-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aw-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aw-bg)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
