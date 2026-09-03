/*
 * design-system-v1 — DataTable primitive (Wave 4b, T4.10).
 *
 * Generic, sticky-header, client-side-sortable data table for the
 * Cyber-Jade design system. Replaces 7 native `<table>` instances
 * (TradeTable.tsx L67, AdminPlansPage.tsx L145, AdminAnalyticsPage
 * L122, AdminPaymentsPage L121, AdminUsersPage L206, CuentasPage
 * L235; pricing/ComparisonTable.tsx stays native per design.md
 * §11.4 — it's a feature-vs-feature grid, not a row-based table).
 * Wave 5 (T5.10–T5.12) migrates the consumers one by one.
 *
 * Composition (per orchestrator brief + design.md §4.7):
 *   - container: `<table>` with `w-full border-collapse`
 *   - sticky `<thead>`: `sticky top-0 z-10 bg-surface/60
 *     backdrop-blur-glass-sm border-b border-primary/20`
 *   - header cells: `text-text-secondary text-xs font-display
 *     uppercase tracking-wide`
 *   - body rows: `border-b border-white/[0.05]` (per
 *     cyber-jade-tokens; this is the white/[0.05] NOT a jade value)
 *     + `hover:bg-white/[0.02]`
 *   - body cells: `px-4 py-3`
 *   - row click: `cursor-pointer` when `onRowClick` is provided
 *
 * Sorting:
 *   - click cycles asc → desc → none per sortable column
 *   - `aria-sort` reflects the active direction
 *   - sort applies client-side via `sortAccessor` (returns string or
 *     number)
 *
 * Loading / empty:
 *   - `loading=true`: renders `skeletonRows` placeholder rows (default
 *     5). The Skeleton primitive ships in T4.8 — for now we render
 *     inline shimmer divs (the design system rule says loading state
 *     uses Skeleton, but Skeleton does not exist yet at this wave's
 *     slice; the inline version is a faithful placeholder).
 *   - `loading=false` + `rows.length === 0`: renders `emptyState` prop
 *     or default "Sin datos" message
 *
 * Accessibility:
 *   - `<table>` is a real table; rows are `<tr>`; headers are `<th>`
 *   - sortable headers are `<button>`s inside the `<th>` so they
 *     read as actions to the screen reader
 *   - `aria-sort` is set per sortable column
 *
 * Why no `clsx`: same Wave 1 read-only rule. Class composition is
 * `[...].filter(Boolean).join(' ')` chains.
 */
import {
  forwardRef,
  useMemo,
  useState,
  type ReactNode,
  type Ref,
} from 'react';

export type ColumnAlign = 'left' | 'right' | 'center';
export type SortDirection = 'asc' | 'desc';

export interface ColumnDef<T> {
  readonly key: string;
  readonly header: ReactNode;
  readonly cell?: (row: T) => ReactNode;
  readonly width?: string;
  readonly align?: ColumnAlign;
  readonly sortable?: boolean;
  readonly sortAccessor?: (row: T) => string | number;
}

export interface DataTableProps<T> {
  readonly columns: ReadonlyArray<ColumnDef<T>>;
  readonly rows: ReadonlyArray<T>;
  readonly rowKey: (row: T) => string;
  readonly emptyState?: ReactNode;
  readonly loading?: boolean;
  readonly skeletonRows?: number;
  readonly onRowClick?: (row: T) => void;
  readonly initialSort?: { readonly key: string; readonly direction: SortDirection };
  readonly className?: string;
}

interface SortState {
  readonly key: string;
  readonly direction: SortDirection;
}

const ALIGN_CLASSES: Record<ColumnAlign, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

/**
 * Default Skeleton row placeholder. The full <Skeleton> primitive
 * ships in T4.8 — until then the inline shimmer is a faithful
 * placeholder for the loading state. The shape stays consistent with
 * the eventual Skeleton variant="text" form (a single thin row per
 * body row).
 */
function SkeletonRow({ columns }: { readonly columns: number }): JSX.Element {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: columns }).map((_, idx) => (
        <td key={idx} className="px-4 py-3 border-b border-white/[0.05]">
          <div className="h-3 w-full max-w-[180px] rounded bg-white/[0.06]" />
        </td>
      ))}
    </tr>
  );
}

function DataTableInner<T>(
  props: DataTableProps<T>,
  ref: Ref<HTMLTableElement>,
): JSX.Element {
  const {
    columns,
    rows,
    rowKey,
    emptyState,
    loading = false,
    skeletonRows = 5,
    onRowClick,
    initialSort,
    className,
  } = props;

  const [sortState, setSortState] = useState<SortState | null>(
    initialSort ? { key: initialSort.key, direction: initialSort.direction } : null,
  );

  const sortedRows = useMemo(() => {
    if (sortState === null) return rows;
    const col = columns.find((c) => c.key === sortState.key);
    if (col === undefined || col.sortAccessor === undefined) return rows;

    const accessor = col.sortAccessor;
    const direction = sortState.direction === 'asc' ? 1 : -1;

    return [...rows].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      return compareValues(av, bv) * direction;
    });
  }, [rows, columns, sortState]);

  const cycleSort = (key: string): void => {
    setSortState((prev) => {
      if (prev === null || prev.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      // desc → none
      return null;
    });
  };

  const ariaSortValue = (
    key: string,
  ): 'ascending' | 'descending' | 'none' => {
    if (sortState === null || sortState.key !== key) return 'none';
    return sortState.direction === 'asc' ? 'ascending' : 'descending';
  };

  const tableClasses = ['w-full border-collapse', className]
    .filter(Boolean)
    .join(' ');

  const rowBaseClasses =
    'border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors';

  const renderHeader = (col: ColumnDef<T>): JSX.Element => {
    const alignClass = ALIGN_CLASSES[col.align ?? 'left'];
    const headerClasses = [
      'px-4 py-3 font-display uppercase tracking-wide text-xs text-text-secondary',
      alignClass,
    ].join(' ');

    if (col.sortable === true) {
      const ariaSort = ariaSortValue(col.key);
      return (
        <th
          key={col.key}
          scope="col"
          aria-sort={ariaSort}
          className={headerClasses}
          style={col.width !== undefined ? { width: col.width } : undefined}
        >
          <button
            type="button"
            aria-label={`Sort by ${typeof col.header === 'string' ? col.header : col.key}`}
            className="inline-flex items-center gap-1 hover:text-primary transition-colors"
            onClick={() => cycleSort(col.key)}
          >
            <span>{col.header}</span>
            <span aria-hidden="true" className="text-[10px]">
              {ariaSort === 'ascending' ? '▲' : ariaSort === 'descending' ? '▼' : ''}
            </span>
          </button>
        </th>
      );
    }

    return (
      <th
        key={col.key}
        scope="col"
        className={headerClasses}
        style={col.width !== undefined ? { width: col.width } : undefined}
      >
        {col.header}
      </th>
    );
  };

  const renderCell = (col: ColumnDef<T>, row: T): ReactNode => {
    if (col.cell !== undefined) return col.cell(row);
    // Fall back to a property access by string key. The `cell` prop is
    // the documented way to render row data, but we tolerate the
    // "just put a key matching a field name" pattern so the primitive
    // is ergonomic for the simplest cases.
    const value = (row as unknown as Record<string, unknown>)[col.key];
    return value === undefined || value === null ? '' : String(value);
  };

  const renderRows = (): ReactNode => {
    if (loading) {
      return Array.from({ length: skeletonRows }).map((_, idx) => (
        <SkeletonRow key={`skeleton-${idx}`} columns={columns.length} />
      ));
    }
    if (sortedRows.length === 0) {
      return (
        <tr>
          <td
            colSpan={columns.length}
            className="px-4 py-8 text-center text-text-secondary font-body text-sm"
          >
            {emptyState ?? 'Sin datos'}
          </td>
        </tr>
      );
    }
    return sortedRows.map((row) => {
      const key = rowKey(row);
      const clickable = onRowClick !== undefined;
      return (
        <tr
          key={key}
          data-row-key={key}
          onClick={clickable ? () => onRowClick?.(row) : undefined}
          className={[rowBaseClasses, clickable ? 'cursor-pointer' : null]
            .filter(Boolean)
            .join(' ')}
        >
          {columns.map((col) => {
            const alignClass = ALIGN_CLASSES[col.align ?? 'left'];
            return (
              <td
                key={col.key}
                className={['px-4 py-3 text-sm font-body text-text-primary', alignClass].join(' ')}
              >
                {renderCell(col, row)}
              </td>
            );
          })}
        </tr>
      );
    });
  };

  return (
    <table ref={ref} className={tableClasses}>
      <thead className="sticky top-0 z-10 bg-surface/60 backdrop-blur-glass-sm border-b border-primary/20">
        <tr>{columns.map(renderHeader)}</tr>
      </thead>
      <tbody>{renderRows()}</tbody>
    </table>
  );
}

/**
 * Generic DataTable component. Forwarded refs target the root
 * `<table>` element so callers can grab the underlying DOM node
 * (for scroll measurement, integration tests, etc.).
 */
export const DataTable = forwardRef(DataTableInner) as <T>(
  props: DataTableProps<T> & { readonly ref?: Ref<HTMLTableElement> },
) => JSX.Element;

export type DataTableComponent = typeof DataTable;
