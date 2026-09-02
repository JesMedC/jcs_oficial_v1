/*
 * portal-fase0a-base — tests for the ephemeral drawer + palette stores.
 *
 * These stores carry no persistence layer; the tests focus on
 * idempotent open/close/toggle behaviour plus the fact that the
 * initial render starts at `false`.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { useNewTradeDrawer } from '../useNewTradeDrawer';
import { useCommandPalette } from '../useCommandPalette';
import { useRiskLevel } from '../useRiskLevel';

beforeEach(() => {
  useNewTradeDrawer.setState({ isOpen: false });
  useCommandPalette.setState({ isOpen: false });
  useRiskLevel.setState({ level: 'green' });
});

describe('useNewTradeDrawer', () => {
  it('starts closed', () => {
    expect(useNewTradeDrawer.getState().isOpen).toBe(false);
  });

  it('open() flips to true; close() back to false', () => {
    useNewTradeDrawer.getState().open();
    expect(useNewTradeDrawer.getState().isOpen).toBe(true);
    useNewTradeDrawer.getState().close();
    expect(useNewTradeDrawer.getState().isOpen).toBe(false);
  });

  it('toggle() flips twice idempotently', () => {
    const toggle = useNewTradeDrawer.getState().toggle;
    toggle();
    expect(useNewTradeDrawer.getState().isOpen).toBe(true);
    toggle();
    expect(useNewTradeDrawer.getState().isOpen).toBe(false);
  });
});

describe('useCommandPalette', () => {
  it('starts closed', () => {
    expect(useCommandPalette.getState().isOpen).toBe(false);
  });

  it('open() flips to true', () => {
    useCommandPalette.getState().open();
    expect(useCommandPalette.getState().isOpen).toBe(true);
  });
});

describe('useRiskLevel', () => {
  it("defaults to 'green' (FASE 0A placeholder)", () => {
    expect(useRiskLevel.getState().level).toBe('green');
  });

  it("set('red') updates level", () => {
    useRiskLevel.getState().set('red');
    expect(useRiskLevel.getState().level).toBe('red');
  });

  it("set('yellow') updates level and back to 'green'", () => {
    useRiskLevel.getState().set('yellow');
    expect(useRiskLevel.getState().level).toBe('yellow');
    useRiskLevel.getState().set('green');
    expect(useRiskLevel.getState().level).toBe('green');
  });
});
