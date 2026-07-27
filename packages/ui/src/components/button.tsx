import { Slot } from "@radix-ui/react-slot";
import { cn } from "@workspace/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm outline-none transition-[color,background-color,box-shadow,transform,border-color,opacity] duration-150 ease-out focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_oklch(0_0_0/0.2),inset_0_1px_0_oklch(1_0_0/0.12)] hover:bg-primary/90 hover:shadow-[0_2px_6px_oklch(0_0_0/0.25),inset_0_1px_0_oklch(1_0_0/0.15)] active:scale-[0.97] active:shadow-[0_0px_1px_oklch(0_0_0/0.1),inset_0_0px_0_oklch(1_0_0/0.08)]",
        destructive:
          "bg-destructive text-white shadow-[0_1px_2px_oklch(0_0_0/0.2),inset_0_1px_0_oklch(1_0_0/0.1)] hover:bg-destructive/90 hover:shadow-[0_2px_6px_oklch(0_0_0/0.25),inset_0_1px_0_oklch(1_0_0/0.12)] focus-visible:ring-destructive/20 active:scale-[0.97] active:shadow-[0_0px_1px_oklch(0_0_0/0.1)] dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-[0_1px_2px_oklch(0_0_0/0.06)] hover:bg-accent hover:text-accent-foreground hover:shadow-[0_2px_5px_oklch(0_0_0/0.1)] active:scale-[0.97] active:shadow-[0_0px_1px_oklch(0_0_0/0.04)] dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_1px_2px_oklch(0_0_0/0.06)] hover:bg-secondary/80 hover:shadow-[0_2px_4px_oklch(0_0_0/0.08)] active:scale-[0.97] active:shadow-[0_0px_1px_oklch(0_0_0/0.04)]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      data-slot="button"
      data-variant={variant ?? "default"}
      {...props}
    />
  );
}

export { Button, buttonVariants };
