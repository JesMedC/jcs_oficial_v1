import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricCard } from '../MetricCard';
import { SurfacePanel } from '../SurfacePanel';

describe('SurfacePanel', () => {
  it('renders semantic variants and interactive motion hook', () => {
    render(
      <SurfacePanel variant="elevated" interactive>
        Panel content
      </SurfacePanel>,
    );

    const panel = screen.getByText('Panel content');
    expect(panel).toHaveClass('motion-surface');
    expect(panel).toHaveClass('bg-[var(--color-bg-elevated)]');
  });
});

describe('MetricCard', () => {
  it('renders financial value, detail, and semantic tone', () => {
    render(
      <MetricCard
        label="Net P&L"
        value="$1,240.00"
        detail="This month"
        trend="+12.4%"
        tone="positive"
      />,
    );

    expect(screen.getByText('Net P&L')).toBeInTheDocument();
    expect(screen.getByText('$1,240.00')).toHaveClass('text-[var(--color-state-positive)]');
    expect(screen.getByText('This month')).toBeInTheDocument();
    expect(screen.getByText('+12.4%')).toBeInTheDocument();
  });
});
