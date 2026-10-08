import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/* The prototype's .btn (calm.ly-workforce-v15.html:423-449, 939-940): 38px,
   0 16px, radius 8, 14px/600, gap 7px, a 1px border that is transparent
   unless the kind draws one. On a phone every button grows to the 44px touch
   target with the padding to match; the small size does too (the prototype
   stops at 40px there, spec §10.3 does not). The focus ring is the base
   layer's :focus-visible box-shadow (src/index.css), --qp-ring-focus. */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-[7px] rounded-control border border-transparent text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color] duration-(--qp-duration-fast) ease-qp outline-none disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-tint disabled:text-text-disabled aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-brand-hover active:bg-brand-active",
        destructive: "border-err bg-transparent text-err hover:bg-err-surface",
        outline: "border-border-strong bg-surface-card text-text-primary hover:bg-surface-tint",
        secondary: "bg-brand-subtle text-brand hover:bg-brand-subtle-hover dark:text-brand-accent",
        ghost: "border-transparent bg-transparent text-text-secondary hover:bg-surface-tint hover:text-text-primary",
        success: "bg-ok text-white hover:bg-ok/90",
        link: "h-auto border-0 p-0 text-xs font-semibold text-brand underline dark:text-brand-accent",
      },
      size: {
        default: "h-10 px-lg max-md:h-auto max-md:min-h-touch max-md:px-[18px] max-md:py-[11px]",
        sm: "h-8 rounded-control px-[11px] text-xs max-md:h-auto max-md:min-h-touch max-md:px-[14px] max-md:py-[9px] max-md:text-sm",
        xs: "h-7 rounded-control px-sm text-xs",
        lg: "h-11 px-xl",
        icon: "size-10 rounded-control",
        "icon-xs": "size-7 rounded-control",
        "icon-sm": "size-8 rounded-control",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
