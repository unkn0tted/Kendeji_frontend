import type { ReactNode } from "react";

/**
 * Standard page heading for user-area pages: title on the left, optional
 * supporting line underneath, optional action cluster on the right.
 * Keeps every page opening with the same rhythm instead of dumping cards.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="grid min-w-0 gap-1">
        <h1 className="font-display font-semibold text-2xl tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
