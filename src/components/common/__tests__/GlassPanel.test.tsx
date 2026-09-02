/*
 * p0ui.1 — GlassPanel unit tests.
 *
 * Covers the variant × blur × highlight × className composition. The
 * "translucent panel" effect is a CSS outcome, not a logical one, so
 * we assert via class names rather than DOM measure. RTL renders the
 * element as a plain <div>; we use that as the assertion target.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { GlassPanel } from '../GlassPanel';

describe('GlassPanel', () => {
  it('renders with default classes (variant=default, blur=default, highlight=true)', () => {
    render(<GlassPanel data-testid="panel">content</GlassPanel>);
    const panel = screen.getByTestId('panel');

    expect(panel).toHaveClass('bg-glass');
    expect(panel).toHaveClass('border-glass-border');
    expect(panel).toHaveClass('backdrop-blur-glass');
    expect(panel).toHaveClass('rounded-glass-lg');
    expect(panel).toHaveClass('shadow-glass-panel');
    expect(panel).toHaveClass('relative');
    expect(panel).toHaveClass('overflow-hidden');

    // Top-edge highlight exists as a sibling of the content. We scope
    // by `pointer-events-none absolute inset-x-0 top-0 h-px` which is
    // unique to the highlight stripe.
    const highlight = panel.querySelector(
      'div.pointer-events-none.absolute.inset-x-0.top-0.h-px',
    );
    expect(highlight).not.toBeNull();
  });

  it("variant 'subtle' applies bg-glass-subtle and border-glass-border-subtle", () => {
    render(
      <GlassPanel data-testid="panel" variant="subtle">
        content
      </GlassPanel>,
    );
    const panel = screen.getByTestId('panel');
    expect(panel).toHaveClass('bg-glass-subtle');
    expect(panel).toHaveClass('border-glass-border-subtle');
    // Should NOT also carry the default-variant classes.
    expect(panel).not.toHaveClass('bg-glass-default');
    expect(panel).not.toHaveClass('border-glass-border-default');
  });

  it("variant 'strong' applies bg-glass-strong and border-glass-border-strong", () => {
    render(
      <GlassPanel data-testid="panel" variant="strong">
        content
      </GlassPanel>,
    );
    const panel = screen.getByTestId('panel');
    expect(panel).toHaveClass('bg-glass-strong');
    expect(panel).toHaveClass('border-glass-border-strong');
    expect(panel).not.toHaveClass('bg-glass-default');
    expect(panel).not.toHaveClass('border-glass-border-default');
  });

  it("blur 'lg' applies backdrop-blur-glass-lg", () => {
    render(
      <GlassPanel data-testid="panel" blur="lg">
        content
      </GlassPanel>,
    );
    const panel = screen.getByTestId('panel');
    expect(panel).toHaveClass('backdrop-blur-glass-lg');
    expect(panel).not.toHaveClass('backdrop-blur-glass');
  });

  it("blur 'sm' applies backdrop-blur-glass-sm", () => {
    render(
      <GlassPanel data-testid="panel" blur="sm">
        content
      </GlassPanel>,
    );
    const panel = screen.getByTestId('panel');
    expect(panel).toHaveClass('backdrop-blur-glass-sm');
  });

  it('highlight=false suppresses the top-edge gradient div', () => {
    render(
      <GlassPanel data-testid="panel" highlight={false}>
        content
      </GlassPanel>,
    );
    const panel = screen.getByTestId('panel');

    expect(panel.querySelector('div.pointer-events-none.absolute.inset-x-0.top-0.h-px')).toBeNull();
  });

  it('renders children inside the panel', () => {
    render(
      <GlassPanel>
        <span data-testid="child">inside</span>
      </GlassPanel>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('forwards extra className merged after the base classes', () => {
    render(
      <GlassPanel data-testid="panel" className="extra-class">
        content
      </GlassPanel>,
    );
    const panel = screen.getByTestId('panel');
    expect(panel).toHaveClass('bg-glass');
    expect(panel).toHaveClass('extra-class');
  });
});
