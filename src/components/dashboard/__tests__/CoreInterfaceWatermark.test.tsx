/*
 * dashboard-jarvis-fidelity (Slice A, T-032, REQ-CWM-003) —
 * CoreInterfaceWatermark chrome-component unit tests.
 *
 * Pins the JARVIS watermark contract from
 * `openspec/changes/dashboard-jarvis-fidelity/specs/decorative-system/spec.md`
 * + `design.md` §5.3:
 *   - container: <div> with data-testid="core-interface-watermark",
 *     pointer-events-none, aria-hidden="true"
 *   - contains exactly 3 child <span> elements
 *   - first span starts with "JADE CAPITAL SUITE" (case-insensitive,
 *     visually uppercase via the font-display + tracking-widest
 *     utility; CSS text-transform is upstream)
 *   - second + third spans equal "JARVIS"
 *   - every span carries opacity-10 + the typography utility set
 *   - the container sits at z-0 inside the chrome layer (above
 *     decor which is -z-10, below content which is z-10+)
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CoreInterfaceWatermark } from '../CoreInterfaceWatermark';

describe('CoreInterfaceWatermark', () => {
  it('mounts a root <div> with data-testid, pointer-events-none, and aria-hidden', () => {
    const { container } = render(<CoreInterfaceWatermark />);
    const root = container.firstElementChild;

    expect(root?.tagName).toBe('DIV');
    expect(root).toHaveAttribute('data-testid', 'core-interface-watermark');
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root).toHaveClass('pointer-events-none');
    // anchored to the chrome layer: absolute + inset-0 + z-0
    expect(root).toHaveClass('absolute');
    expect(root).toHaveClass('inset-0');
    expect(root).toHaveClass('z-0');
  });

  it('contains exactly three child <span> elements', () => {
    const { container } = render(<CoreInterfaceWatermark />);
    const root = container.firstElementChild;
    const spans = root?.querySelectorAll('span') ?? [];

    expect(spans).toHaveLength(3);
  });

  it('first span labels the brand line and starts with "JADE CAPITAL SUITE"', () => {
    render(<CoreInterfaceWatermark />);

    // text-transform: uppercase is upstream (Tailwind utility);
    // match case-insensitively against the rendered text content.
    const brand = screen.getByText(/jade capital suite/i);
    expect(brand).toBeInTheDocument();
    expect(brand.tagName).toBe('SPAN');
  });

  it('second + third spans both label "Jarvis"', () => {
    render(<CoreInterfaceWatermark />);

    const jarvis = screen.getAllByText(/^jarvis$/i);
    expect(jarvis).toHaveLength(2);
    jarvis.forEach((node) => expect(node.tagName).toBe('SPAN'));
  });

  it('every span carries opacity-10 + the typography utility set', () => {
    const { container } = render(<CoreInterfaceWatermark />);
    const spans = container.querySelectorAll('span');

    expect(spans).toHaveLength(3);
    spans.forEach((span) => {
      expect(span).toHaveClass('opacity-10');
      expect(span).toHaveClass('font-display');
      expect(span).toHaveClass('uppercase');
      expect(span).toHaveClass('tracking-widest');
      expect(span).toHaveClass('text-[10px]');
      expect(span).toHaveClass('text-text-muted');
    });
  });

  it('respects the corner anchor contract (top-4 / left-4 + bottom-4 / left-4 + bottom-4 / right-4)', () => {
    const { container } = render(<CoreInterfaceWatermark />);
    const spans = Array.from(container.querySelectorAll('span'));

    // First span (brand line) anchors to top-left.
    expect(spans[0]).toHaveClass('top-4');
    expect(spans[0]).toHaveClass('left-4');
    // Second span (Jarvis) anchors to bottom-left.
    expect(spans[1]).toHaveClass('bottom-4');
    expect(spans[1]).toHaveClass('left-4');
    // Third span (Jarvis) anchors to bottom-right.
    expect(spans[2]).toHaveClass('bottom-4');
    expect(spans[2]).toHaveClass('right-4');
  });
});
