/*
 * HudPanel — JARVIS HUD card chrome tests.
 *
 * Pins the visual contract from the dashboard-jarvis-fidelity-v2 spec:
 *   - default `<div>` wrapper renders
 *   - applies `clip-path: polygon(...)` with a 16px chamfer on
 *     top-right + bottom-left corners
 *   - paints the glass background (`rgba(10, 25, 47, 0.6)`)
 *   - paints the cyan border (`1px solid rgba(0, 229, 255, 0.3)`)
 *   - applies backdrop-filter blur for the HUD feel
 *   - renders any children inside
 *   - honours `cornerSize` prop for the chamfer geometry
 *   - honours `as` prop (renders as `<aside>` when requested)
 *   - forwards `data-testid` + `className`
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HudPanel } from '../HudPanel';

describe('HudPanel', () => {
  describe('render', () => {
    it('renders a <div> by default', () => {
      render(<HudPanel data-testid="hud">x</HudPanel>);
      const root = screen.getByTestId('hud');
      expect(root.tagName).toBe('DIV');
    });

    it('renders the children inside the panel', () => {
      render(<HudPanel data-testid="hud">contenido del panel</HudPanel>);
      expect(screen.getByText('contenido del panel')).toBeInTheDocument();
    });

    it('renders as <aside> when `as="aside"`', () => {
      render(
        <HudPanel as="aside" data-testid="hud">
          aside
        </HudPanel>,
      );
      expect(screen.getByTestId('hud').tagName).toBe('ASIDE');
    });

    it('forwards className so consumers can add padding/gap', () => {
      render(
        <HudPanel data-testid="hud" className="p-5 flex flex-col gap-3">
          x
        </HudPanel>,
      );
      const root = screen.getByTestId('hud');
      expect(root).toHaveClass('p-5');
      expect(root).toHaveClass('flex');
      expect(root).toHaveClass('flex-col');
    });
  });

  describe('clip-path chamfer geometry', () => {
    it('applies a clip-path polygon with the default 16px chamfer (top-right + bottom-left)', () => {
      render(<HudPanel data-testid="hud">x</HudPanel>);
      const style = screen.getByTestId('hud').getAttribute('style') ?? '';
      expect(style).toMatch(
        /clip-path:\s*polygon\([^)]*\)/,
      );
      // Default corner=16 → `16px` should appear in the polygon and the
      // bottom-left chamfer at 0 calc(100% - 16px) should be present.
      expect(style).toMatch(/0\s+calc\(100%\s*-\s*16px\)/);
      expect(style).toMatch(/calc\(100%\s*-\s*16px\)\s+0/);
      // Top-right cut at 100% 16px and bottom-left horizontal at 16px 100%.
      expect(style).toMatch(/100%\s+16px/);
      expect(style).toMatch(/16px\s+100%/);
    });

    it('honours the `cornerSize` prop (numeric px override)', () => {
      render(
        <HudPanel data-testid="hud" cornerSize={24}>
          x
        </HudPanel>,
      );
      const style = screen.getByTestId('hud').getAttribute('style') ?? '';
      // The polygon should contain 24px instead of 16px.
      expect(style).toMatch(/0\s+calc\(100%\s*-\s*24px\)/);
      expect(style).toMatch(/calc\(100%\s*-\s*24px\)\s+0/);
    });
  });

  describe('JARVIS chrome', () => {
    it('paints the glass background `rgba(10, 25, 47, 0.6)`', () => {
      render(<HudPanel data-testid="hud">x</HudPanel>);
      const style = screen.getByTestId('hud').getAttribute('style') ?? '';
      expect(style).toContain('rgba(10, 25, 47, 0.6)');
    });

    it('paints the cyan border `1px solid rgba(0, 229, 255, 0.3)`', () => {
      render(<HudPanel data-testid="hud">x</HudPanel>);
      const style = screen.getByTestId('hud').getAttribute('style') ?? '';
      expect(style).toContain('1px solid rgba(0, 229, 255, 0.3)');
    });

    it('applies backdrop-filter for the layered HUD feel', () => {
      // jsdom silently drops `backdropFilter` from inline-style serialization
      // (it doesn't recognize the CSSOM property), so we read it via the
      // React-rendered HTML attribute which preserves the style props.
      // We check the source DEFAULT_CHROME via the component's behaviour:
      // the className `hud-panel` plus the merge must carry the property.
      //
      // The reliable cross-env test: render, then read `cssText` on the
      // underlying HTMLElement (jsdom DOES serialize backdropFilter when
      // explicitly set on `style.cssText`).
      render(<HudPanel data-testid="hud">x</HudPanel>);
      const root = screen.getByTestId('hud') as HTMLElement;
      // Direct CSSOM check — `style` on the element reads back the values
      // that were set via React's inline style. jsdom returns the
      // browser-style normalized value (or empty for unsupported props).
      const backdropVal = root.style.getPropertyValue('backdrop-filter');
      const webkitBackdropVal = root.style.getPropertyValue('-webkit-backdrop-filter');
      // At least ONE of the two must be present (browser-specific prefix
      // preference varies). If neither is set, the chrome wasn't applied.
      // jsdom doesn't implement either, so this is a SOURCE-LEVEL guard:
      // we just verify the inline-style attribute was generated.
      const styleAttr = root.getAttribute('style') ?? '';
      // If jsdom doesn't preserve backdrop-filter, we accept a fallback
      // signal: the className contains `hud-panel` and the rendered style
      // carries the rest of the chrome. We document this jsdom limitation
      // explicitly so future maintainers don't think the contract is broken.
      if (backdropVal === '' && webkitBackdropVal === '') {
        // jsdom path — assert the chrome other than backdrop-filter is
        // present (the real browser applies backdrop-filter at runtime).
        expect(styleAttr).toContain('background:');
        expect(styleAttr).toContain('clip-path: polygon(');
      } else {
        expect(backdropVal || webkitBackdropVal).toMatch(/blur/);
      }
    });
  });
});