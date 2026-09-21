/*
 * p0ui.1 — GlassCard unit tests.
 *
 * GlassCard composes GlassPanel + padding + optional hover-glow.
 * These tests assert the padding and glow behaviors, and verify
 * GlassCard still emits the panel-level glass classes (so callers
 * don't accidentally opt out of the glass effect by using GlassCard).
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { GlassCard } from '../GlassCard';

describe('GlassCard', () => {
  it('renders with default padding (p-6) and panel glass classes', () => {
    render(<GlassCard data-testid="card">content</GlassCard>);
    const card = screen.getByTestId('card');

    expect(card).toHaveClass('bg-glass');
    expect(card).toHaveClass('backdrop-blur-glass');
    expect(card).toHaveClass('border-glass-border');
    expect(card).toHaveClass('rounded-glass-lg');
    expect(card).toHaveClass('shadow-glass-panel');
    expect(card).toHaveClass('p-6');
  });

  it("padding 'sm' applies p-4", () => {
    render(
      <GlassCard data-testid="card" padding="sm">
        content
      </GlassCard>,
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('p-4');
    expect(card).not.toHaveClass('p-6');
  });

  it("padding 'lg' applies p-8", () => {
    render(
      <GlassCard data-testid="card" padding="lg">
        content
      </GlassCard>,
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('p-8');
    expect(card).not.toHaveClass('p-6');
  });

  it("glow='jade' applies hover:shadow-glow-jade-sm and transition", () => {
    render(
      <GlassCard data-testid="card" glow="jade">
        content
      </GlassCard>,
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('hover:shadow-glow-jade-sm');
    expect(card).toHaveClass('transition-shadow');
    expect(card).toHaveClass('duration-300');
  });

  it("glow='none' (default) does NOT add hover utilities", () => {
    render(<GlassCard data-testid="card">content</GlassCard>);
    const card = screen.getByTestId('card');
    expect(card).not.toHaveClass('hover:shadow-glow-jade-sm');
  });

  it("variant 'strong' propagates to the underlying panel classes", () => {
    render(
      <GlassCard data-testid="card" variant="strong">
        content
      </GlassCard>,
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('bg-glass-strong');
    expect(card).toHaveClass('border-glass-border-strong');
  });

  it('renders children inside the card', () => {
    render(
      <GlassCard>
        <span data-testid="child">inside</span>
      </GlassCard>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
