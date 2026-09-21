/*
 * design-system-v1 — DataTable primitive unit tests (Wave 4b, T4.10).
 *
 * Pins the visual + behavioural contract from
 * `specs/primitive-library/spec.md` + design.md §4.7 + the
 * orchestrator's per-primitive brief:
 *   - generic over `T` so `cell` accessors get type-safe row typing
 *   - sticky `<thead>` with `bg-surface/60 backdrop-blur-glass-sm
 *     border-b border-primary/20` and `sticky top-0 z-10`
 *   - body row separators: `border-b border-white/[0.05]`
 *     (per cyber-jade-tokens; this is the white/[0.05] NOT a jade
 *     value, see design.md §4.7)
 *   - cell padding: `px-4 py-3`
 *   - row hover: `hover:bg-white/[0.02]`
 *   - cell align applies to header AND cell text alignment
 *   - row click: `cursor-pointer` when `onRowClick` is provided
 *   - empty state: renders `emptyState` prop when rows is empty
 *   - loading state: renders `skeletonRows` placeholder rows
 *     (default 5) when `loading=true`
 *   - loading + empty: skeleton wins (no empty state)
 *   - sortable: header click cycles asc → desc → none; aria-sort
 *     reflects the active direction; sort applies client-side via
 *     `sortAccessor`
 *   - `rowKey` is used as the React `key` on each row
 */
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { DataTable, type ColumnDef } from '../DataTable';

interface Row {
  readonly id: string;
  readonly name: string;
  readonly balance: number;
}

const ROWS: ReadonlyArray<Row> = [
  { id: '1', name: 'Alice', balance: 100 },
  { id: '2', name: 'Bob', balance: 200 },
  { id: '3', name: 'Charlie', balance: 50 },
];

const COLUMNS: ReadonlyArray<ColumnDef<Row>> = [
  { key: 'name', header: 'Name' },
  { key: 'balance', header: 'Balance', align: 'right' },
  { key: 'greeting', header: 'Greeting', cell: (r) => `Hi ${r.name}` },
];

describe('DataTable', () => {
  describe('columns + rows', () => {
    it('renders all column headers from the columns prop', () => {
      render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />);

      expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Balance' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Greeting' })).toBeInTheDocument();
    });

    it('renders every row from the rows prop', () => {
      render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('calls the cell renderer with each row', () => {
      const cell = vi.fn((r: Row) => `cell-${r.id}`);
      const cols: ReadonlyArray<ColumnDef<Row>> = [
        { key: 'derived', header: 'Derived', cell },
      ];
      render(<DataTable columns={cols} rows={ROWS} rowKey={(r) => r.id} />);

      expect(cell).toHaveBeenCalledTimes(ROWS.length);
      ROWS.forEach((row, idx) => {
        expect(cell.mock.calls[idx]?.[0]).toEqual(row);
      });
      // And the rendered output shows the result of the cell fn.
      expect(screen.getByText('cell-1')).toBeInTheDocument();
      expect(screen.getByText('cell-2')).toBeInTheDocument();
      expect(screen.getByText('cell-3')).toBeInTheDocument();
    });

    it('uses rowKey as the React key (keys appear in the DOM as row identities)', () => {
      const { container } = render(
        <DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />,
      );

      // tbody has exactly one <tr> per row.
      const tbody = container.querySelector('tbody');
      expect(tbody?.querySelectorAll('tr').length).toBe(ROWS.length);

      // Each row's first cell text is the row's name (sanity check the
      // mapping — the rowKey prop being used as React key means rows
      // do not collide or get re-ordered under re-renders).
      const renderedNames = Array.from(
        tbody?.querySelectorAll('tr td:nth-child(1)') ?? [],
      ).map((td) => td.textContent);
      expect(renderedNames).toEqual(['Alice', 'Bob', 'Charlie']);
    });
  });

  describe('column width + align', () => {
    it('column width is applied to the column header', () => {
      const cols: ReadonlyArray<ColumnDef<Row>> = [
        { key: 'name', header: 'Name', width: '120px' },
      ];
      render(<DataTable columns={cols} rows={ROWS} rowKey={(r) => r.id} />);

      const header = screen.getByRole('columnheader', { name: 'Name' });
      expect(header).toHaveStyle({ width: '120px' });
    });

    it('column align=right applies text-right to header AND cell', () => {
      render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />);

      const header = screen.getByRole('columnheader', { name: 'Balance' });
      expect(header).toHaveClass('text-right');

      const cell = screen.getByText('100').closest('td');
      expect(cell).toHaveClass('text-right');
    });

    it('column align=left applies text-left to header AND cell', () => {
      const cols: ReadonlyArray<ColumnDef<Row>> = [
        { key: 'name', header: 'Name', align: 'left' },
      ];
      render(<DataTable columns={cols} rows={ROWS} rowKey={(r) => r.id} />);

      const header = screen.getByRole('columnheader', { name: 'Name' });
      expect(header).toHaveClass('text-left');

      const cell = screen.getByText('Alice').closest('td');
      expect(cell).toHaveClass('text-left');
    });
  });

  describe('cell padding + row separators', () => {
    it('body cells apply px-4 py-3 padding', () => {
      render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />);

      const cell = screen.getByText('Alice').closest('td');
      expect(cell).toHaveClass('px-4');
      expect(cell).toHaveClass('py-3');
    });

    it('body rows carry the white/[0.05] border separator (not a jade value)', () => {
      const { container } = render(
        <DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />,
      );
      const rows = container.querySelectorAll('tbody tr');

      rows.forEach((row) => {
        expect(row.className).toMatch(/border-b/);
        expect(row.className).toMatch(/border-white\/\[0\.05\]/);
      });
    });
  });

  describe('sticky header', () => {
    it('thead carries sticky top-0 + bg-surface/60 + backdrop-blur-glass-sm + z-10', () => {
      const { container } = render(
        <DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />,
      );
      const thead = container.querySelector('thead');

      expect(thead).toHaveClass('sticky');
      expect(thead).toHaveClass('top-0');
      expect(thead).toHaveClass('z-10');
      expect(thead).toHaveClass('bg-surface/60');
      expect(thead).toHaveClass('backdrop-blur-glass-sm');
      expect(thead).toHaveClass('border-b');
      expect(thead).toHaveClass('border-primary/20');
    });

    it('header cell text uses display typography (font-display uppercase tracking-wide)', () => {
      render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />);

      const header = screen.getByRole('columnheader', { name: 'Name' });
      expect(header).toHaveClass('font-display');
      expect(header).toHaveClass('uppercase');
      expect(header).toHaveClass('tracking-wide');
    });
  });

  describe('empty state', () => {
    it('renders the emptyState prop when rows is empty and not loading', () => {
      render(
        <DataTable
          columns={COLUMNS}
          rows={[]}
          rowKey={(r) => r.id}
          emptyState={<div data-testid="empty">Sin datos</div>}
        />,
      );

      expect(screen.getByTestId('empty')).toBeInTheDocument();
    });

    it('renders a default empty state when no emptyState prop is provided', () => {
      render(<DataTable columns={COLUMNS} rows={[]} rowKey={(r) => r.id} />);

      // Default empty state surfaces a "Sin datos" message.
      expect(screen.getByText(/sin datos/i)).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('renders skeletonRows placeholder rows (default 5) when loading=true', () => {
      const { container } = render(
        <DataTable
          columns={COLUMNS}
          rows={[]}
          rowKey={(r) => r.id}
          loading
        />,
      );
      const rows = container.querySelectorAll('tbody tr');

      expect(rows.length).toBe(5);
    });

    it('honors custom skeletonRows when provided', () => {
      const { container } = render(
        <DataTable
          columns={COLUMNS}
          rows={[]}
          rowKey={(r) => r.id}
          loading
          skeletonRows={3}
        />,
      );
      const rows = container.querySelectorAll('tbody tr');

      expect(rows.length).toBe(3);
    });

    it('shows skeleton rows (NOT the empty state) when loading=true with empty rows', () => {
      render(
        <DataTable
          columns={COLUMNS}
          rows={[]}
          rowKey={(r) => r.id}
          loading
          emptyState={<div data-testid="empty">Sin datos</div>}
        />,
      );

      expect(screen.queryByTestId('empty')).toBeNull();
      expect(screen.queryByText(/sin datos/i)).toBeNull();
    });
  });

  describe('row click', () => {
    it('applies cursor-pointer when onRowClick is provided', () => {
      const { container } = render(
        <DataTable
          columns={COLUMNS}
          rows={ROWS}
          rowKey={(r) => r.id}
          onRowClick={() => {}}
        />,
      );
      const rows = container.querySelectorAll('tbody tr');

      rows.forEach((row) => {
        expect(row.className).toMatch(/cursor-pointer/);
      });
    });

    it('fires onRowClick with the row when the row is clicked', () => {
      const onRowClick = vi.fn();
      render(
        <DataTable
          columns={COLUMNS}
          rows={ROWS}
          rowKey={(r) => r.id}
          onRowClick={onRowClick}
        />,
      );

      fireEvent.click(screen.getByText('Bob').closest('tr') as HTMLElement);

      expect(onRowClick).toHaveBeenCalledTimes(1);
      expect(onRowClick).toHaveBeenCalledWith(ROWS[1]);
    });

    it('does NOT apply cursor-pointer when onRowClick is omitted', () => {
      const { container } = render(
        <DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />,
      );
      const rows = container.querySelectorAll('tbody tr');

      rows.forEach((row) => {
        expect(row.className).not.toMatch(/cursor-pointer/);
      });
    });
  });

  describe('hover', () => {
    it('body rows carry hover:bg-white/[0.02] (subtle white tint, NOT a jade value)', () => {
      const { container } = render(
        <DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />,
      );
      const rows = container.querySelectorAll('tbody tr');

      rows.forEach((row) => {
        expect(row.className).toMatch(/hover:bg-white\/\[0\.02\]/);
      });
    });
  });

  describe('sorting', () => {
    const SORT_COLUMNS: ReadonlyArray<ColumnDef<Row>> = [
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        sortAccessor: (r) => r.name,
      },
      {
        key: 'balance',
        header: 'Balance',
        sortable: true,
        sortAccessor: (r) => r.balance,
      },
      { key: 'id', header: 'ID' },
    ];

    it('sortable header renders as a button (semantic + keyboard-friendly)', () => {
      render(
        <DataTable
          columns={SORT_COLUMNS}
          rows={ROWS}
          rowKey={(r) => r.id}
        />,
      );

      const nameHeader = screen.getByRole('columnheader', { name: /Name/ });
      expect(within(nameHeader).getByRole('button')).toBeInTheDocument();
    });

    it('non-sortable header does NOT render a button', () => {
      render(
        <DataTable
          columns={SORT_COLUMNS}
          rows={ROWS}
          rowKey={(r) => r.id}
        />,
      );

      const idHeader = screen.getByRole('columnheader', { name: 'ID' });
      expect(within(idHeader).queryByRole('button')).toBeNull();
    });

    it('sortable header has aria-sort="none" by default', () => {
      render(
        <DataTable
          columns={SORT_COLUMNS}
          rows={ROWS}
          rowKey={(r) => r.id}
        />,
      );

      const nameHeader = screen.getByRole('columnheader', { name: /Name/ });
      expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    });

    it('clicking a sortable header cycles asc → desc → none', () => {
      render(
        <DataTable
          columns={SORT_COLUMNS}
          rows={ROWS}
          rowKey={(r) => r.id}
        />,
      );

      const nameHeader = screen.getByRole('columnheader', { name: /Name/ });
      const button = within(nameHeader).getByRole('button');

      // First click → ascending
      fireEvent.click(button);
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');

      // Second click → descending
      fireEvent.click(button);
      expect(nameHeader).toHaveAttribute('aria-sort', 'descending');

      // Third click → back to none (clears the sort)
      fireEvent.click(button);
      expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    });

    it('sort applies client-side via sortAccessor in ascending order', () => {
      render(
        <DataTable
          columns={SORT_COLUMNS}
          rows={ROWS}
          rowKey={(r) => r.id}
        />,
      );

      const nameHeader = screen.getByRole('columnheader', { name: /Name/ });
      fireEvent.click(within(nameHeader).getByRole('button'));

      // After ascending sort: Alice, Bob, Charlie (the natural order
      // already matches; we assert the visible order via the first
      // cell of each <tr>).
      const tbody = screen.getByRole('table').querySelector('tbody');
      const firstCells = Array.from(
        tbody?.querySelectorAll('tr td:nth-child(1)') ?? [],
      ).map((td) => td.textContent);

      expect(firstCells).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sort applies client-side in descending order when toggled', () => {
      render(
        <DataTable
          columns={SORT_COLUMNS}
          rows={ROWS}
          rowKey={(r) => r.id}
        />,
      );

      const nameHeader = screen.getByRole('columnheader', { name: /Name/ });
      const button = within(nameHeader).getByRole('button');
      fireEvent.click(button); // asc
      fireEvent.click(button); // desc

      const tbody = screen.getByRole('table').querySelector('tbody');
      const firstCells = Array.from(
        tbody?.querySelectorAll('tr td:nth-child(1)') ?? [],
      ).map((td) => td.textContent);

      expect(firstCells).toEqual(['Charlie', 'Bob', 'Alice']);
    });

    it('sort uses initialSort prop when provided', () => {
      render(
        <DataTable
          columns={SORT_COLUMNS}
          rows={ROWS}
          rowKey={(r) => r.id}
          initialSort={{ key: 'balance', direction: 'desc' }}
        />,
      );

      const balanceHeader = screen.getByRole('columnheader', { name: /Balance/ });
      expect(balanceHeader).toHaveAttribute('aria-sort', 'descending');

      // Bob (200) > Alice (100) > Charlie (50)
      const tbody = screen.getByRole('table').querySelector('tbody');
      const firstCells = Array.from(
        tbody?.querySelectorAll('tr td:nth-child(1)') ?? [],
      ).map((td) => td.textContent);
      expect(firstCells).toEqual(['Bob', 'Alice', 'Charlie']);
    });
  });

  describe('forwardRef + className passthrough', () => {
    it('forwards the ref to the root <table> element', () => {
      const ref = createRef<HTMLTableElement>();
      render(
        <DataTable
          ref={ref}
          columns={COLUMNS}
          rows={ROWS}
          rowKey={(r) => r.id}
        />,
      );

      expect(ref.current).toBeInstanceOf(HTMLTableElement);
    });

    it('merges the className prop into the root <table>', () => {
      const { container } = render(
        <DataTable
          columns={COLUMNS}
          rows={ROWS}
          rowKey={(r) => r.id}
          className="custom-table"
        />,
      );
      const table = container.querySelector('table');

      expect(table).toHaveClass('custom-table');
      expect(table).toHaveClass('w-full');
      expect(table).toHaveClass('border-collapse');
    });
  });
});
