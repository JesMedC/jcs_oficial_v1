/*
 * portal-fase0a-base — tests for the three topbar widgets.
 *
 * Each widget owns a single integration with its backing store; the
 * tests assert the read-from-store contract plus the click -> store
 * contract. jsdom's render doesn't ship a layout engine so visual
 * placement / responsive classes are not asserted here.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { RiskSemaphore } from '../RiskSemaphore';
import { CommandPaletteTrigger } from '../CommandPaletteTrigger';
import { NewTradeButton } from '../NewTradeButton';
import { useRiskLevel } from '../../../stores/useRiskLevel';
import { useCommandPalette } from '../../../stores/useCommandPalette';
import { useNewTradeDrawer } from '../../../stores/useNewTradeDrawer';

beforeEach(() => {
  useRiskLevel.setState({ level: 'green' });
  useCommandPalette.setState({ isOpen: false });
  useNewTradeDrawer.setState({ isOpen: false });
});

describe('RiskSemaphore', () => {
  it('renders green by default with aria-label "Riesgo: green"', () => {
    render(<RiskSemaphore />);
    const node = screen.getByTestId('risk-semaphore');
    expect(node.getAttribute('aria-label')).toBe('Riesgo: green');
  });

  it('reflects level after set("red")', () => {
    useRiskLevel.getState().set('red');
    render(<RiskSemaphore />);
    expect(screen.getByTestId('risk-semaphore').getAttribute('aria-label')).toBe(
      'Riesgo: red',
    );
  });
});

describe('CommandPaletteTrigger', () => {
  it('click invokes useCommandPalette.open()', () => {
    render(<CommandPaletteTrigger />);
    fireEvent.click(screen.getByTestId('command-palette-trigger'));
    expect(useCommandPalette.getState().isOpen).toBe(true);
  });
});

describe('NewTradeButton', () => {
  it('click invokes useNewTradeDrawer.open()', () => {
    render(<NewTradeButton />);
    fireEvent.click(screen.getByTestId('new-trade-button'));
    expect(useNewTradeDrawer.getState().isOpen).toBe(true);
  });
});
