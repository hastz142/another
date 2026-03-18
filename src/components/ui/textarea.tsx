import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-[var(--aw-border)] bg-[var(--aw-card)] px-3 py-2 text-sm text-[var(--aw-text)] placeholder:text-[var(--aw-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aw-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aw-bg)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
