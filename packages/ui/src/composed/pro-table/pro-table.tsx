"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import Empty from "@workspace/ui/composed/empty";
import { normalizePageSize } from "@workspace/ui/composed/pagination-config";
import {
  ColumnFilter,
  type IParams,
} from "@workspace/ui/composed/pro-table/column-filter";
import { ColumnHeader } from "@workspace/ui/composed/pro-table/column-header";
import { ColumnToggle } from "@workspace/ui/composed/pro-table/column-toggle";
import { Pagination } from "@workspace/ui/composed/pro-table/pagination";
import { SortableRow } from "@workspace/ui/composed/pro-table/sortable-row";
import { ProTableWrapper } from "@workspace/ui/composed/pro-table/wrapper";
import { cn } from "@workspace/ui/lib/utils";
import type { TFunction } from "i18next";
import { GripVertical, ListRestart, Loader, RefreshCcw } from "lucide-react";
import type React from "react";
import {
  Fragment,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export interface ProTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  request: (
    pagination: {
      page: number;
      size: number;
    },
    filter: TValue,
    context: ProTableRequestContext
  ) => Promise<{ list: TData[]; total: number }>;
  params?: IParams[];
  header?: {
    title?: React.ReactNode;
    toolbar?: React.ReactNode | React.ReactNode[];
    hidden?: boolean;
  };
  actions?: {
    render?: (row: TData) => React.ReactNode[];
    batchRender?: (rows: TData[]) => React.ReactNode[];
  };
  action?: React.Ref<ProTableActions | undefined>;
  texts?: Partial<{
    actions: string;
    asc: string;
    desc: string;
    hide: string;
    textRowsPerPage: string;
    textPageOf: (current: number, total: number) => string;
    selectedRowsText: (total: number) => string;
  }>;
  empty?: React.ReactNode;
  onSort?: (
    sourceId: string | number,
    targetId: string | number | null,
    items: TData[]
  ) => Promise<TData[]>;
  initialFilters?: Record<string, unknown>;
  requestDebounceMs?: number;
  getRowId?: (originalRow: TData, index: number) => string;
}

export interface ProTableRequestContext {
  sorting: SortingState;
  force: boolean;
}

export interface ProTableActions {
  refresh: () => void;
  reset: () => void;
}

export function ProTable<
  TData extends Record<string, unknown> & { id?: string | number },
  TValue extends Record<string, unknown>,
>({
  columns,
  request,
  params,
  header,
  actions,
  action,
  texts,
  empty,
  onSort,
  initialFilters,
  requestDebounceMs = 300,
  getRowId,
}: ProTableProps<TData, TValue>) {
  const { t } = useTranslation("components");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
    if (initialFilters) {
      return Object.entries(initialFilters).map(([id, value]) => ({
        id,
        value,
      })) as ColumnFiltersState;
    }
    return [];
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [data, setData] = useState<TData[]>([]);
  const [rowCount, setRowCount] = useState<number>(0);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [isLoading, setIsLoading] = useState(false);
  const requestSequence = useRef(0);
  const hasFetchedRef = useRef(false);

  const tableColumns = useMemo(
    () =>
      [
        ...(onSort
          ? [
              {
                id: "sortable",
                header: (
                  <GripVertical className="h-4 w-4 cursor-move text-gray-500 hover:text-gray-700" />
                ),
                enableSorting: false,
                enableHiding: false,
              },
            ]
          : []),
        ...(actions?.batchRender ? [createSelectColumn<TData, TValue>(t)] : []),
        ...columns.map(
          (column) =>
            ({
              enableSorting: false,
              ...column,
            }) as ColumnDef<TData, TValue>
        ),
        ...(actions?.render
          ? ([
              {
                id: "actions",
                header: texts?.actions,
                cell: ({ row }) => (
                  <div className="flex items-center justify-end gap-2">
                    {actions.render?.(row.original).map((item, index) => (
                      <Fragment key={index}>{item}</Fragment>
                    ))}
                  </div>
                ),
                enableSorting: false,
                enableHiding: false,
              },
            ] as ColumnDef<TData, TValue>[])
          : []),
      ] as ColumnDef<TData, TValue>[],
    [actions, columns, onSort, texts?.actions, t]
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    getRowId,
    onPaginationChange: (updater) => {
      setPagination(updater);
      setRowSelection({});
    },
    onSortingChange: (updater) => {
      setSorting(updater);
      setRowSelection({});
      setPagination((current) =>
        current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
      );
    },
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater);
      setRowSelection({});
      setPagination((current) =>
        current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
    manualPagination: true,
    manualFiltering: true,
    rowCount,
    manualSorting: true,
  });

  const fetchData = async (force = false) => {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setIsLoading(true);
    try {
      const response = await request(
        {
          page: pagination.pageIndex + 1,
          size: normalizePageSize(pagination.pageSize),
        },
        Object.fromEntries(
          columnFilters.map((item) => [item.id, item.value])
        ) as TValue,
        { sorting, force }
      );
      if (sequence === requestSequence.current) {
        setData(response.list);
        setRowCount(response.total);
      }
    } catch (error) {
      if (sequence === requestSequence.current) {
        console.error("Fetch data error:", error);
        toast.error(t("table.loadFailed", "Failed to load data"));
      }
    } finally {
      if (sequence === requestSequence.current) {
        setIsLoading(false);
      }
    }
  };
  const reset = async () => {
    table.resetSorting();
    table.resetColumnFilters();
    table.resetGlobalFilter(true);
    table.resetColumnVisibility();
    table.resetRowSelection();
    table.resetPagination();
  };

  useImperativeHandle(action, () => ({
    refresh: () => {
      fetchData(true);
    },
    reset,
  }));

  useEffect(() => {
    // The first fetch fires immediately; the debounce only smooths later
    // page/filter/sort churn (e.g. typing into a column filter).
    if (requestDebounceMs <= 0 || !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchData();
      return;
    }

    const timer = setTimeout(fetchData, requestDebounceMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    JSON.stringify(columnFilters),
    JSON.stringify(sorting),
    requestDebounceMs,
  ]);

  const selectedRows = table
    .getSelectedRowModel()
    .flatRows.map((row) => row.original);
  const selectedCount = selectedRows.length;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {!header?.hidden && (
        <div className="flex flex-wrap-reverse items-center justify-between gap-4">
          <div>
            {params ? (
              <ColumnFilter
                filters={Object.fromEntries(
                  columnFilters.map((item) => [item.id, item.value])
                )}
                params={params}
                table={table}
              />
            ) : (
              header?.title
            )}
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            <Button
              onClick={() => {
                fetchData(true);
              }}
              size="icon"
              variant="outline"
            >
              <RefreshCcw />
            </Button>
            <ColumnToggle table={table} />
            <Button onClick={reset} size="icon" variant="outline">
              <ListRestart />
            </Button>
            {header?.toolbar}
          </div>
        </div>
      )}

      {selectedCount > 0 && actions?.batchRender && (
        <Alert className="flex items-center justify-between">
          <AlertTitle className="m-0 tabular-nums">
            {texts?.selectedRowsText?.(selectedCount) ||
              t("table.selectedRows", "Selected {{count}} rows", {
                count: selectedCount,
              })}
          </AlertTitle>
          <AlertDescription className="flex gap-2">
            {actions.batchRender(selectedRows)}
          </AlertDescription>
        </Alert>
      )}

      <div className="relative w-full min-w-0 overflow-x-auto rounded-md border">
        <ProTableWrapper data={data} onSort={onSort} setData={setData}>
          <Table className="w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      className={getTableHeaderClass(header.column.id)}
                      key={header.id}
                    >
                      <ColumnHeader
                        header={header}
                        text={{
                          asc: texts?.asc,
                          desc: texts?.desc,
                          hide: texts?.hide,
                        }}
                      />
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading && !table.getRowModel()?.rows?.length ? (
                Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
                  <TableRow key={`skeleton-${rowIndex}`}>
                    {table
                      .getVisibleFlatColumns()
                      .map((column, columnIndex) => (
                        <TableCell
                          className={getTableCellClass(column.id)}
                          key={column.id}
                        >
                          <SkeletonCell
                            columnId={column.id}
                            seed={rowIndex + columnIndex}
                          />
                        </TableCell>
                      ))}
                  </TableRow>
                ))
              ) : table.getRowModel()?.rows?.length ? (
                onSort ? (
                  table.getRowModel().rows.map((row) => (
                    <SortableRow
                      data-state={row.getIsSelected() && "selected"}
                      id={
                        row.original.id
                          ? String(row.original.id)
                          : String(row.index)
                      }
                      isSortable
                      key={
                        row.original.id
                          ? String(row.original.id)
                          : String(row.index)
                      }
                    >
                      {row
                        .getVisibleCells()
                        .filter((cell) => cell.column.id !== "sortable")
                        .map((cell) => (
                          <TableCell
                            className={getTableCellClass(cell.column.id)}
                            key={cell.id}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                    </SortableRow>
                  ))
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      data-state={row.getIsSelected() && "selected"}
                      key={row.id}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          className={getTableCellClass(cell.column.id)}
                          key={cell.id}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )
              ) : (
                <TableRow>
                  <TableCell
                    className="py-16"
                    colSpan={table.getVisibleFlatColumns().length}
                  >
                    <div className="flex items-center justify-center">
                      {empty || <Empty />}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ProTableWrapper>

        {isLoading && data.length > 0 && (
          <div className="absolute top-0 z-30 flex h-full w-full items-center justify-center bg-muted/80">
            <Loader className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
      {rowCount > 0 && <Pagination table={table} />}
    </div>
  );
}

function createSelectColumn<TData, TValue>(
  t: TFunction<"components">
): ColumnDef<TData, TValue> {
  return {
    id: "selected",
    header: ({ table }) => (
      <Checkbox
        aria-label={t("table.selectAll", "Select all")}
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={t("table.selectRow", "Select row")}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };
}

/**
 * Header cells are sticky on the top axis so the header row stays readable
 * when the table's scroll container scrolls vertically. The bg must be
 * opaque (`bg-card`) so zebra rows never show through; the pinned corner
 * cells (select / actions) get a higher z-index so they win over the plain
 * header cells during horizontal scrolling, mirroring the body's pinned
 * columns.
 */
function getTableHeaderClass(columnId: string) {
  if (["sortable", "selected"].includes(columnId)) {
    return "sticky top-0 left-0 z-20 bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] [&:has([role=checkbox])]:pr-2";
  }
  if (columnId === "actions") {
    return "sticky top-0 right-0 z-20 text-right bg-card shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]";
  }
  return "sticky top-0 z-10 truncate bg-card";
}

function getTableCellClass(columnId: string) {
  if (["sortable", "selected"].includes(columnId)) {
    return "sticky left-0 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]";
  }
  if (columnId === "actions") {
    return "sticky right-0 bg-background shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]";
  }
  return "truncate";
}

const SKELETON_ROW_COUNT = 8;
const SKELETON_CELL_WIDTHS = ["w-24", "w-16", "w-32", "w-20", "w-28"];

/** Placeholder cell shown while the first page of data is loading. */
function SkeletonCell({ columnId, seed }: { columnId: string; seed: number }) {
  if (["sortable", "selected"].includes(columnId)) {
    return <Skeleton className="size-4" />;
  }
  if (columnId === "actions") {
    return <Skeleton className="ml-auto h-4 w-16" />;
  }
  return (
    <Skeleton
      className={cn(
        "h-4",
        SKELETON_CELL_WIDTHS[seed % SKELETON_CELL_WIDTHS.length]
      )}
    />
  );
}
