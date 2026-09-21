/*
 * design-system-v1 — Tabs primitive unit tests (Wave 4b, T4.9).
 *
 * Pins the visual + behavioural contract from
 * `specs/primitive-library/spec.md` + design.md §4.8 + the
 * orchestrator's per-primitive brief:
 *   - container: `border-b border-primary/20`
 *   - tablist: `<div role="tablist">`
 *   - tab button: `<button role="tab">` with `aria-selected`
 *   - active: `text-primary border-b-2 border-primary`
 *   - inactive: `text-text-secondary hover:text-primary/70`
 *   - disabled: `opacity-50 cursor-not-allowed`
 *   - controlled vs uncontrolled: prefer uncontrolled with
 *     `defaultActiveKey` if `activeKey` not provided
 *   - URL sync: when `urlSyncKey` is set, read initial active from
 *     `?{urlSyncKey}=<key>` and update the URL via
 *     `history.replaceState` (not push) on tab change
 *   - keyboard nav: ArrowLeft/Right cycle, Home/End jump,
 *     Enter/Space activate
 *   - ARIA wiring: tab buttons expose `aria-controls={panelId}`,
 *     panels expose `aria-labelledby={tabId}`
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Tabs, type TabItem } from '../Tabs';

const ITEMS: ReadonlyArray<TabItem> = [
  { key: 'one', label: 'Uno', panel: <div>Panel uno</div> },
  { key: 'two', label: 'Dos', panel: <div>Panel dos</div> },
  { key: 'three', label: 'Tres', panel: <div>Panel tres</div> },
];

afterEach(() => {
  // Restore window.history to a clean state for the URL-sync tests.
  window.history.replaceState({}, '', '/');
  vi.restoreAllMocks();
});

describe('Tabs', () => {
  describe('rendering', () => {
    it('renders one tab button per item', () => {
      render(<Tabs items={ITEMS} defaultActiveKey="one" />);

      expect(screen.getByRole('tab', { name: 'Uno' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Dos' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tres' })).toBeInTheDocument();
    });

    it('renders the tablist with role="tablist"', () => {
      const { container } = render(
        <Tabs items={ITEMS} defaultActiveKey="one" />,
      );
      const tablist = container.querySelector('[role="tablist"]');

      expect(tablist).not.toBeNull();
    });

    it('renders only the active panel by default', () => {
      render(<Tabs items={ITEMS} defaultActiveKey="two" />);

      expect(screen.getByText('Panel dos')).toBeInTheDocument();
      expect(screen.queryByText('Panel uno')).toBeNull();
      expect(screen.queryByText('Panel tres')).toBeNull();
    });

    it('applies the container border-b border-primary/20', () => {
      const { container } = render(
        <Tabs items={ITEMS} defaultActiveKey="one" />,
      );
      // The first rendered <div> is the container.
      const root = container.firstElementChild as HTMLElement;

      expect(root).toHaveClass('border-b');
      expect(root).toHaveClass('border-primary/20');
    });

    it('active tab applies jade underline + text-primary', () => {
      render(<Tabs items={ITEMS} defaultActiveKey="two" />);
      const active = screen.getByRole('tab', { name: 'Dos' });

      expect(active).toHaveClass('text-primary');
      expect(active).toHaveClass('border-b-2');
      expect(active).toHaveClass('border-primary');
    });

    it('inactive tabs use text-text-secondary', () => {
      render(<Tabs items={ITEMS} defaultActiveKey="two" />);
      const inactive = screen.getByRole('tab', { name: 'Uno' });

      expect(inactive).toHaveClass('text-text-secondary');
      expect(inactive).not.toHaveClass('border-primary');
    });
  });

  describe('ARIA wiring', () => {
    it('active tab has aria-selected="true" and others aria-selected="false"', () => {
      render(<Tabs items={ITEMS} defaultActiveKey="two" />);

      expect(screen.getByRole('tab', { name: 'Dos' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByRole('tab', { name: 'Uno' })).toHaveAttribute(
        'aria-selected',
        'false',
      );
      expect(screen.getByRole('tab', { name: 'Tres' })).toHaveAttribute(
        'aria-selected',
        'false',
      );
    });

    it('panel is wrapped in role="tabpanel" with aria-labelledby pointing at the active tab', () => {
      render(<Tabs items={ITEMS} defaultActiveKey="two" />);
      const tab = screen.getByRole('tab', { name: 'Dos' });
      const tabId = tab.getAttribute('id');

      expect(tabId).not.toBeNull();

      const panel = screen.getByRole('tabpanel');
      expect(panel).toHaveAttribute('aria-labelledby', tabId);
    });

    it('tab button exposes aria-controls pointing at the panel id', () => {
      render(<Tabs items={ITEMS} defaultActiveKey="two" />);
      const tab = screen.getByRole('tab', { name: 'Dos' });
      const panel = screen.getByRole('tabpanel');

      expect(tab).toHaveAttribute('aria-controls', panel.id);
    });

    it('uses the ariaLabel prop on the tablist', () => {
      render(
        <Tabs items={ITEMS} defaultActiveKey="one" ariaLabel="Secciones" />,
      );
      const tablist = screen.getByRole('tablist', { name: 'Secciones' });

      expect(tablist).toBeInTheDocument();
    });
  });

  describe('controlled vs uncontrolled', () => {
    it('defaultActiveKey drives the initial active tab (uncontrolled)', () => {
      render(<Tabs items={ITEMS} defaultActiveKey="three" />);

      expect(screen.getByRole('tab', { name: 'Tres' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByText('Panel tres')).toBeInTheDocument();
    });

    it('falls back to the first item when no defaultActiveKey is provided', () => {
      render(<Tabs items={ITEMS} />);

      expect(screen.getByRole('tab', { name: 'Uno' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    it('activeKey prop drives the panel when provided (controlled)', () => {
      render(<Tabs items={ITEMS} activeKey="three" onChange={() => {}} />);

      expect(screen.getByText('Panel tres')).toBeInTheDocument();
      expect(screen.queryByText('Panel uno')).toBeNull();
    });
  });

  describe('click activation', () => {
    it('clicking a tab changes the active panel (uncontrolled)', async () => {
      const user = userEvent.setup();
      render(<Tabs items={ITEMS} defaultActiveKey="one" />);

      await user.click(screen.getByRole('tab', { name: 'Dos' }));

      expect(screen.getByText('Panel dos')).toBeInTheDocument();
      expect(screen.queryByText('Panel uno')).toBeNull();
    });

    it('onChange fires with the new key when a tab is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Tabs items={ITEMS} defaultActiveKey="one" onChange={onChange} />,
      );

      await user.click(screen.getByRole('tab', { name: 'Tres' }));

      expect(onChange).toHaveBeenCalledWith('three');
    });

    it('controlled mode: clicking calls onChange but does not change the active panel', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Tabs items={ITEMS} activeKey="one" onChange={onChange} />);

      await user.click(screen.getByRole('tab', { name: 'Dos' }));

      expect(onChange).toHaveBeenCalledWith('two');
      // The activeKey prop stays at "one", so the panel does not change.
      expect(screen.getByText('Panel uno')).toBeInTheDocument();
    });
  });

  describe('disabled tab', () => {
    it('disabled tab is not clickable (clicking it does not activate it)', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const items: ReadonlyArray<TabItem> = [
        { key: 'a', label: 'A', panel: <div>A</div> },
        { key: 'b', label: 'B', panel: <div>B</div>, disabled: true },
      ];
      render(<Tabs items={items} defaultActiveKey="a" onChange={onChange} />);

      await user.click(screen.getByRole('tab', { name: 'B' }));

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('tab', { name: 'A' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    it('disabled tab applies opacity-50 cursor-not-allowed', () => {
      const items: ReadonlyArray<TabItem> = [
        { key: 'a', label: 'A', panel: <div>A</div> },
        { key: 'b', label: 'B', panel: <div>B</div>, disabled: true },
      ];
      render(<Tabs items={items} defaultActiveKey="a" />);
      const disabled = screen.getByRole('tab', { name: 'B' });

      expect(disabled).toHaveClass('opacity-50');
      expect(disabled).toHaveClass('cursor-not-allowed');
      expect(disabled).toBeDisabled();
    });
  });

  describe('keyboard navigation', () => {
    it('ArrowRight moves focus to the next tab', async () => {
      const user = userEvent.setup();
      render(<Tabs items={ITEMS} defaultActiveKey="one" />);
      const one = screen.getByRole('tab', { name: 'Uno' });
      const two = screen.getByRole('tab', { name: 'Dos' });

      one.focus();
      await user.keyboard('{ArrowRight}');

      expect(document.activeElement).toBe(two);
    });

    it('ArrowLeft moves focus to the previous tab', async () => {
      const user = userEvent.setup();
      render(<Tabs items={ITEMS} defaultActiveKey="two" />);
      const one = screen.getByRole('tab', { name: 'Uno' });
      const two = screen.getByRole('tab', { name: 'Dos' });

      two.focus();
      await user.keyboard('{ArrowLeft}');

      expect(document.activeElement).toBe(one);
    });

    it('ArrowRight at the last tab wraps to the first (or stays at the last, depending on impl)', async () => {
      const user = userEvent.setup();
      render(<Tabs items={ITEMS} defaultActiveKey="three" />);
      const three = screen.getByRole('tab', { name: 'Tres' });
      const one = screen.getByRole('tab', { name: 'Uno' });

      three.focus();
      await user.keyboard('{ArrowRight}');

      // Spec says "cycle" — we wrap to the first tab.
      expect(document.activeElement).toBe(one);
    });

    it('ArrowLeft at the first tab wraps to the last', async () => {
      const user = userEvent.setup();
      render(<Tabs items={ITEMS} defaultActiveKey="one" />);
      const one = screen.getByRole('tab', { name: 'Uno' });
      const three = screen.getByRole('tab', { name: 'Tres' });

      one.focus();
      await user.keyboard('{ArrowLeft}');

      expect(document.activeElement).toBe(three);
    });

    it('Home jumps focus to the first tab', async () => {
      const user = userEvent.setup();
      render(<Tabs items={ITEMS} defaultActiveKey="three" />);
      const one = screen.getByRole('tab', { name: 'Uno' });
      const three = screen.getByRole('tab', { name: 'Tres' });

      three.focus();
      await user.keyboard('{Home}');

      expect(document.activeElement).toBe(one);
    });

    it('End jumps focus to the last tab', async () => {
      const user = userEvent.setup();
      render(<Tabs items={ITEMS} defaultActiveKey="one" />);
      const three = screen.getByRole('tab', { name: 'Tres' });
      const one = screen.getByRole('tab', { name: 'Uno' });

      one.focus();
      await user.keyboard('{End}');

      expect(document.activeElement).toBe(three);
    });

    it('Enter activates the focused tab', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Tabs items={ITEMS} defaultActiveKey="one" onChange={onChange} />,
      );
      const two = screen.getByRole('tab', { name: 'Dos' });

      two.focus();
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledWith('two');
    });

    it('Space activates the focused tab', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Tabs items={ITEMS} defaultActiveKey="one" onChange={onChange} />,
      );
      const three = screen.getByRole('tab', { name: 'Tres' });

      three.focus();
      await user.keyboard(' ');

      expect(onChange).toHaveBeenCalledWith('three');
    });

    it('keyboard ArrowRight skips disabled tabs', async () => {
      const user = userEvent.setup();
      const items: ReadonlyArray<TabItem> = [
        { key: 'a', label: 'A', panel: <div>A</div> },
        { key: 'b', label: 'B', panel: <div>B</div>, disabled: true },
        { key: 'c', label: 'C', panel: <div>C</div> },
      ];
      render(<Tabs items={items} defaultActiveKey="a" />);
      const a = screen.getByRole('tab', { name: 'A' });
      const c = screen.getByRole('tab', { name: 'C' });

      a.focus();
      await user.keyboard('{ArrowRight}');
      // B is disabled and not focusable; ArrowRight should land on C.
      expect(document.activeElement).toBe(c);
    });
  });

  describe('URL sync', () => {
    it('reads initial active from the URL when urlSyncKey matches a query param', () => {
      window.history.replaceState({}, '', '/?section=two');
      render(<Tabs items={ITEMS} urlSyncKey="section" />);

      expect(screen.getByRole('tab', { name: 'Dos' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByText('Panel dos')).toBeInTheDocument();
    });

    it('falls back to defaultActiveKey when urlSyncKey param is missing', () => {
      window.history.replaceState({}, '', '/');
      render(
        <Tabs items={ITEMS} urlSyncKey="section" defaultActiveKey="three" />,
      );

      expect(screen.getByRole('tab', { name: 'Tres' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    it('clicking a tab calls history.replaceState (NOT pushState) with the new key', async () => {
      const user = userEvent.setup();
      const replaceSpy = vi.spyOn(window.history, 'replaceState');
      const pushSpy = vi.spyOn(window.history, 'pushState');

      window.history.replaceState({}, '', '/');
      render(
        <Tabs items={ITEMS} urlSyncKey="section" defaultActiveKey="one" />,
      );

      await user.click(screen.getByRole('tab', { name: 'Dos' }));

      expect(replaceSpy).toHaveBeenCalled();
      expect(pushSpy).not.toHaveBeenCalled();
      // The new URL has ?section=two
      const lastCall = replaceSpy.mock.calls.at(-1);
      expect(lastCall?.[2]).toContain('section=two');
    });
  });

  describe('className passthrough', () => {
    it('merges the className prop into the container', () => {
      const { container } = render(
        <Tabs
          items={ITEMS}
          defaultActiveKey="one"
          className="custom-tabs"
        />,
      );
      const root = container.firstElementChild as HTMLElement;

      expect(root).toHaveClass('custom-tabs');
      expect(root).toHaveClass('border-b');
    });
  });
});
