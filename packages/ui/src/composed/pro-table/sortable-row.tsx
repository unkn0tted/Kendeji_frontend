import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TableCell, TableRow } from "@workspace/ui/components/table";
import { GripVertical } from "lucide-react";
import type React from "react";

interface SortableRowProps {
  id: string;
  children: React.ReactNode;
  isSortable: boolean;
  disabled?: boolean;
  handleLabel?: string;
}

export function SortableRow({
  id,
  children,
  isSortable,
  disabled = false,
  handleLabel,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id,
      disabled: !isSortable || disabled,
    });

  const style = {
    transform: CSS.Transform.toString({
      x: 0,
      y: transform?.y || 0,
      scaleX: transform?.scaleX || 1,
      scaleY: transform?.scaleY || 1,
    }),
    transition,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      {isSortable ? (
        <TableCell
          {...attributes}
          {...(disabled ? {} : listeners)}
          aria-disabled={disabled || undefined}
          aria-label={handleLabel}
          className={disabled ? "cursor-wait" : "cursor-move"}
          title={handleLabel}
        >
          <GripVertical
            aria-hidden="true"
            className={
              disabled
                ? "h-4 w-4 cursor-wait text-gray-400"
                : "h-4 w-4 cursor-move text-gray-500 hover:text-gray-700"
            }
          />
        </TableCell>
      ) : null}
      {children}
    </TableRow>
  );
}
