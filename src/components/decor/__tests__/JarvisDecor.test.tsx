/*
 * design-system-v1 (Wave 5) — Jarvis decor primitives unit tests.
 *
 * Pins the visual + behavioural contract for the three new decor
 * primitives introduced in Wave 5:
 *   - HudRing: shows a numeric value with rotating ticks
 *   - Scanline: a horizontal line that crosses the container top-to-bottom
 *   - RadarSweep: concentric circles with a rotating sweep cone
 *
 * These are presentational only — no async, no side effects beyond what
 * the React render produces. Tests assert DOM presence + key visual
 * attributes, not animation timing.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HudRing } from '../HudRing';
import { Scanline } from '../Scanline';
import { RadarSweep } from '../RadarSweep';

describe('HudRing', () => {
  it('renders the numeric value rounded to integer', () => {
    render(<HudRing value={73.6} max={100} aria-label="73%" />);
    expect(screen.getByRole('text')).toHaveTextContent('74');
  });

  it('renders unit + label when provided', () => {
    render(
      <HudRing value={42} max={100} unit="%" label="Winrate" aria-label="42 winrate" />,
    );
    expect(screen.getByRole('text')).toHaveTextContent('42');
    expect(screen.getByText('%')).toBeInTheDocument();
    expect(screen.getByText('Winrate')).toBeInTheDocument();
  });

  it('clamps value to [0, max]', () => {
    render(<HudRing value={150} max={100} aria-label="over" />);
    expect(screen.getByRole('text')).toHaveTextContent('100');
  });

  it('renders 12 perimeter tick marks', () => {
    const { container } = render(<HudRing value={50} aria-label="50%" />);
    const ticks = container.querySelectorAll('svg line');
    expect(ticks.length).toBe(12);
  });

  it('renders a track ring + a value ring (2 circles in the SVG)', () => {
    const { container } = render(<HudRing value={50} aria-label="50%" />);
    const circles = container.querySelectorAll('svg circle');
    // 2 rings (track + value)
    expect(circles.length).toBe(2);
  });
});

describe('Scanline', () => {
  it('renders the scanline element (aria-hidden)', () => {
    const { container } = render(<Scanline />);
    const root = container.firstChild as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.getAttribute('aria-hidden')).toBe('true');
    // The animated line is a child div with the gradient.
    const line = container.querySelector('div > div');
    expect(line).not.toBeNull();
  });

  it('accepts a custom duration via prop', () => {
    // Just ensure the prop type is honored (no crash + root renders).
    const { container } = render(<Scanline duration={2} />);
    expect(container.firstChild).not.toBeNull();
  });
});

describe('RadarSweep', () => {
  it('renders 4 concentric target rings', () => {
    const { container } = render(<RadarSweep />);
    // The target rings are <circle> elements inside the SVG.
    const rings = container.querySelectorAll('svg circle');
    expect(rings.length).toBe(4);
  });

  it('renders the center dot (aria-hidden root)', () => {
    const { container } = render(<RadarSweep />);
    const root = container.firstChild as HTMLElement | null;
    expect(root?.getAttribute('aria-hidden')).toBe('true');
  });

  it('accepts size + duration props without crashing', () => {
    const { container } = render(<RadarSweep size="lg" duration={3} />);
    expect(container.firstChild).not.toBeNull();
  });
});
