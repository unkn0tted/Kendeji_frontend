import { cn } from "@workspace/ui/lib/utils";
import type { ReactNode } from "react";

export type DescriptionItem = {
  label: ReactNode;
  value: ReactNode;
  /** Hide the entry entirely (keeps call sites free of ternaries). */
  hidden?: boolean;
};

/**
 * Label/value grid used across order, wallet, ticket, affiliate and billing
 * views — replaces the hand-rolled `ul.grid grid-cols-2 gap-3 *:flex ...`
 * markup that was copy-pasted per page.
 */
export function DescriptionList({
  items,
  className,
}: {
  items: DescriptionItem[];
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-3 *:flex *:flex-col lg:grid-cols-4",
        className
      )}
    >
      {items
        .filter((item) => !item.hidden)
        .map((item, index) => (
          <li className="min-w-0 font-semibold" key={index}>
            <span className="text-muted-foreground">{item.label}</span>
            {item.value}
          </li>
        ))}
    </ul>
  );
}
