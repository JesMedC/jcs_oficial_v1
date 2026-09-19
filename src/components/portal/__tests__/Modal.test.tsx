/*
 * DVC-01 — Modal portal / stacking / focus / viewport regression tests.
 *
 * Locks the four contracts the modal promises after the dashboard
 * visual consistency pass:
 *
 *   1. Portal mount — the dialog renders into `document.body`, not
 *      inside the calling subtree, so ancestor backdrop-filter /
 *      transform / overflow contexts cannot trap the z-50 layer.
 *   2. Focus lifecycle — initial focus lands on the first focusable
 *      element inside the panel; Tab / Shift+Tab cycle within the
 *      modal; Escape closes; the previously focused element is
 *      restored on close.
 *   3. A11y surface — `role="dialog"`, `aria-modal="true"`, the
 *      title node gets an id and the dialog references it via
 *      `aria-labelledby`. While open, every sibling of the portal
 *      node in `document.body` is marked `inert` + `aria-hidden`.
 *   4. Viewport-aware body — the body is scrollable (`overflow-y-auto`)
 *      and capped with `dvh` so a long form does not push the footer
 *      CTAs off-screen on mobile.
 *
 * Existing Escape + backdrop-click dismissal stays intact (regression
 * locked). The footer slot is honoured — submit buttons placed in the
 * footer trigger the form via `form="<id>"` association.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { Modal } from '../Modal';

function makeLongFormBody(): ReactNode {
  // 60 text inputs — enough to overflow a 360px tall viewport in any
  // reasonable font. The form carries an `id` so the footer submit
  // can target it via the `form` attribute (HTML form association).
  return (
    <form id="long-form" data-testid="long-form" className="flex flex-col gap-2">
      {Array.from({ length: 60 }, (_, i) => (
        <input
          key={i}
          type="text"
          data-testid={`long-form-row-${i}`}
          aria-label={`row ${i}`}
        />
      ))}
    </form>
  );
}

describe('Modal — DVC-01 portal / stacking', () => {
  it('mounts the dialog into document.body, not inside the calling subtree', () => {
    // The calling subtree carries a backdrop-blur ancestor — the
    // exact pattern that creates a containing stacking context in
    // real browsers. jsdom has no layout engine, but we can still
    // assert via the DOM tree that the portal node lives at the
    // body root.
    const { getByTestId } = render(
      <div data-testid="caller" className="backdrop-blur-md">
        <Modal
          open
          onClose={() => undefined}
          title="T"
        >
          <span data-testid="modal-body-child">x</span>
        </Modal>
      </div>,
    );

    const dialog = screen.getByRole('dialog');
    const caller = getByTestId('caller');
    expect(caller.contains(dialog)).toBe(false);
    expect(dialog.parentElement).toBe(document.body);
  });

  it('the dialog parent survives a backdrop-blur ancestor (no stacking trap)', () => {
    // Direct mount of a backdrop-blur wrapper around the modal: the
    // dialog still ends up at body root, not nested under the
    // backdrop-blur div. This is the regression DVC-01 fixes.
    const { container } = render(
      <div data-testid="backdrop-host" className="backdrop-blur-md overflow-hidden">
        <Modal
          open
          onClose={() => undefined}
          title="T"
        >
          <span data-testid="modal-body-child">x</span>
        </Modal>
      </div>,
    );

    const host = container.querySelector('[data-testid="backdrop-host"]') as HTMLElement;
    const dialog = screen.getByRole('dialog');
    expect(host.contains(dialog)).toBe(false);
    expect(dialog.parentElement).toBe(document.body);
  });

  it('Escape still closes the modal (regression)', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">
        <button type="button">inside</button>
      </Modal>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('backdrop click still closes the modal (regression)', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">
        <span>inside</span>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    // The dialog itself is the backdrop wrapper; clicking it directly
    // (target === currentTarget) must close.
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking inside the panel does NOT close the modal', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">
        <button type="button" data-testid="inside-btn">inside</button>
      </Modal>,
    );
    fireEvent.click(screen.getByTestId('inside-btn'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('Modal — DVC-01 a11y surface', () => {
  it('exposes role=dialog + aria-modal=true + aria-labelledby pointing to title', () => {
    render(
      <Modal open onClose={() => undefined} title="Cerrar trade">
        <span>x</span>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const titleEl = labelledBy ? document.getElementById(labelledBy) : null;
    expect(titleEl).not.toBeNull();
    expect(titleEl?.textContent).toBe('Cerrar trade');
  });

  it('marks every document.body sibling of the portal as inert + aria-hidden while open', () => {
    // Sentinel elements live at body level before the portal mounts.
    // They MUST be marked inert + aria-hidden for as long as the
    // modal is open and restored when it closes.
    const sentinelA = document.createElement('div');
    sentinelA.setAttribute('data-testid', 'sentinel-a');
    const sentinelB = document.createElement('div');
    sentinelB.setAttribute('data-testid', 'sentinel-b');
    document.body.appendChild(sentinelA);
    document.body.appendChild(sentinelB);

    try {
      const { unmount } = render(
        <Modal open onClose={() => undefined} title="T">
          <span>x</span>
        </Modal>,
      );

      expect(sentinelA.hasAttribute('inert')).toBe(true);
      expect(sentinelA.getAttribute('aria-hidden')).toBe('true');
      expect(sentinelB.hasAttribute('inert')).toBe(true);
      expect(sentinelB.getAttribute('aria-hidden')).toBe('true');

      // Unmount (close) restores the previously unmarked state.
      unmount();

      expect(sentinelA.hasAttribute('inert')).toBe(false);
      expect(sentinelA.hasAttribute('aria-hidden')).toBe(false);
      expect(sentinelB.hasAttribute('inert')).toBe(false);
      expect(sentinelB.hasAttribute('aria-hidden')).toBe(false);
    } finally {
      sentinelA.remove();
      sentinelB.remove();
    }
  });

  it('aria-describedby is set when caller provides a description node id', () => {
    // Description is optional — the modal only forwards the id when
    // the caller supplies one (CloseTradeModal does not currently
    // need it, but the contract is in place for future copy).
    render(
      <>
        <p id="modal-description">Some description</p>
        <Modal
          open
          onClose={() => undefined}
          title="T"
          aria-describedby="modal-description"
        >
          <span>x</span>
        </Modal>
      </>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-describedby')).toBe('modal-description');
  });
});

describe('Modal — DVC-01 focus lifecycle', () => {
  it('on open, focus moves into the panel (lands on first focusable element)', async () => {
    render(
      <Modal open onClose={() => undefined} title="T">
        <input data-testid="first-input" />
        <input data-testid="second-input" />
      </Modal>,
    );
    await waitFor(() => {
      const active = document.activeElement as HTMLElement | null;
      // Either the first interactive element in the panel OR the
      // close button — both satisfy "focus is inside the dialog".
      expect(screen.getByRole('dialog').contains(active)).toBe(true);
    });
  });

  it('Tab cycles focus through every focusable in the panel, wrapping back to the first', async () => {
    render(
      <Modal open onClose={() => undefined} title="T">
        <input data-testid="first-input" />
        <input data-testid="second-input" />
        <button type="button" data-testid="inside-btn">go</button>
      </Modal>,
    );
    const firstInput = screen.getByTestId('first-input');
    const secondInput = screen.getByTestId('second-input');
    const insideBtn = screen.getByTestId('inside-btn');
    const closeBtn = screen.getByRole('button', { name: 'Cerrar' });

    // Initial focus lands on the first focusable — the close button
    // is at the top of the panel so it is the natural entry point.
    await waitFor(() => {
      expect(document.activeElement).toBe(closeBtn);
    });

    // Tab advances through the rest of the focusables.
    fireEvent.keyDown(closeBtn, { key: 'Tab' });
    expect(document.activeElement).toBe(firstInput);
    fireEvent.keyDown(firstInput, { key: 'Tab' });
    expect(document.activeElement).toBe(secondInput);
    fireEvent.keyDown(secondInput, { key: 'Tab' });
    expect(document.activeElement).toBe(insideBtn);

    // Wrap from the last focusable back to the first.
    fireEvent.keyDown(insideBtn, { key: 'Tab' });
    expect(document.activeElement).toBe(closeBtn);
  });

  it('Shift+Tab from the first focusable wraps to the last (focus trap reverse)', async () => {
    render(
      <Modal open onClose={() => undefined} title="T">
        <input data-testid="first-input" />
        <button type="button" data-testid="inside-btn">go</button>
      </Modal>,
    );
    const closeBtn = screen.getByRole('button', { name: 'Cerrar' });
    const insideBtn = screen.getByTestId('inside-btn');

    // Wait for initial focus to land inside the panel before driving
    // the trap — without this, the first keyDown races with the
    // requestAnimationFrame that moves focus on mount.
    await waitFor(() => {
      expect(document.activeElement).toBe(closeBtn);
    });

    // Shift+Tab from the first focusable (close button) wraps to
    // the last focusable in the panel.
    fireEvent.keyDown(closeBtn, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(insideBtn);
  });

  it('restores focus to the previously focused element on close', async () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'trigger';
    trigger.setAttribute('data-testid', 'outside-trigger');
    document.body.appendChild(trigger);
    try {
      trigger.focus();
      const { rerender, unmount } = render(
        <Modal open onClose={() => undefined} title="T">
          <input data-testid="inside-input" />
        </Modal>,
      );
      // While open, focus should be inside the dialog (not on trigger).
      await waitFor(() => {
        expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
      });
      rerender(
        <Modal open={false} onClose={() => undefined} title="T">
          <input data-testid="inside-input" />
        </Modal>,
      );
      await waitFor(() => {
        expect(document.activeElement).toBe(trigger);
      });
      unmount();
    } finally {
      trigger.remove();
    }
  });
});

describe('Modal — DVC-01 viewport-aware body + footer slot', () => {
  it('panel is constrained by dvh, body is scrollable, footer stays anchored', () => {
    render(
      <Modal
        open
        onClose={() => undefined}
        title="Largo"
        footer={
          <>
            <button type="button" data-testid="footer-cancel">Cancelar</button>
            <button type="submit" form="long-form" data-testid="footer-submit">
              Enviar
            </button>
          </>
        }
      >
        {makeLongFormBody()}
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    const panel = dialog.querySelector('[data-modal-panel]') as HTMLElement | null;
    expect(panel).not.toBeNull();

    // The PANEL carries the viewport cap — `max-h` expressed in dvh
    // with breathing room for the backdrop padding. The body inside
    // fills the remaining flex space (flex-1 + min-h-0) and is the
    // element that scrolls, so a long form never pushes the footer
    // off-screen on a mobile viewport.
    expect(panel!.className).toMatch(/max-h-\[calc\(100dvh/);
    expect(panel!.className).toMatch(/flex/);
    expect(panel!.className).toMatch(/overflow-hidden/);

    const body = panel!.querySelector('[data-modal-body]') as HTMLElement | null;
    expect(body).not.toBeNull();
    expect(body!.className).toMatch(/overflow-y-auto/);
    expect(body!.className).toMatch(/flex-1/);
    expect(body!.className).toMatch(/min-h-0/);

    // The footer submit lives OUTSIDE the scrollable body — it is a
    // sibling of the body inside the flex column so it always sits
    // at the bottom of the panel, reachable without dismissing.
    const footer = panel!.querySelector('[data-modal-footer]') as HTMLElement | null;
    expect(footer).not.toBeNull();
    expect(footer!.contains(screen.getByTestId('footer-submit'))).toBe(true);
    expect(footer!.contains(screen.getByTestId('footer-cancel'))).toBe(true);
    expect(body!.contains(screen.getByTestId('footer-submit'))).toBe(false);

    // All 60 long-form rows render (they live inside the scrollable
    // body; the panel never overflows the viewport).
    expect(screen.getByTestId('long-form-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('long-form-row-59')).toBeInTheDocument();
  });

  it('footer submit triggers the form via form="<id>" association', () => {
    // The submit button is in the footer (outside the form). It must
    // still dispatch the form's submit handler through HTML form
    // association — the long-form submit fires and updates the panel.
    let submitted = false;
    render(
      <Modal
        open
        onClose={() => undefined}
        title="Largo"
        footer={
          <button
            type="submit"
            form="long-form"
            data-testid="footer-submit"
          >
            Enviar
          </button>
        }
      >
        <form
          id="long-form"
          data-testid="long-form"
          onSubmit={(e) => {
            e.preventDefault();
            submitted = true;
          }}
        >
          <input data-testid="inside-input" />
        </form>
      </Modal>,
    );
    fireEvent.click(screen.getByTestId('footer-submit'));
    expect(submitted).toBe(true);
  });
});

describe('Modal — DVC-01 lifecycle edge cases', () => {
  beforeEach(() => {
    // Clean portal nodes that linger across tests (React Testing
    // Library unmount is best-effort; this guards the body).
    Array.from(document.body.children).forEach((child) => {
      if (child.getAttribute('data-modal-portal') === 'true') child.remove();
    });
  });

  afterEach(() => {
    Array.from(document.body.children).forEach((child) => {
      if (child.getAttribute('data-modal-portal') === 'true') child.remove();
    });
  });

  it('renders nothing when open=false', () => {
    const { container } = render(
      <Modal open={false} onClose={() => undefined} title="T">
        <span>x</span>
      </Modal>,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
