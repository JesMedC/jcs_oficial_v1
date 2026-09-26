import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RiskPreview } from '../RiskPreview';

describe('RiskPreview', () => {
  it('renders BINARY exposure and worst-case risk from the calculated investment', () => {
    render(
      <RiskPreview
        selectedType="BINARY"
        accountBalance="100.00"
        binaryInvestment={12.5}
        forexLotSize="0.1"
        forexEntryPrice="1.0850"
        forexStopLoss=""
      />,
    );

    expect(screen.getByTestId('risk-preview-balance')).toHaveTextContent('$100.00');
    expect(screen.getByTestId('risk-preview-exposure')).toHaveTextContent('$12.50');
    expect(screen.getByTestId('risk-preview-risk')).toHaveTextContent('$12.50');
    expect(screen.getByTestId('risk-preview-post-balance')).toHaveTextContent('$87.50');
    expect(screen.getByTestId('risk-preview-status')).toHaveTextContent('Listo para revisar');
  });

  it('renders complete FOREX exposure and estimated risk from lot, entry, and stop', () => {
    render(
      <RiskPreview
        selectedType="FOREX"
        accountBalance="250.00"
        binaryInvestment={null}
        forexLotSize="2"
        forexEntryPrice="1.25"
        forexStopLoss="1.2"
      />,
    );

    expect(screen.getByTestId('risk-preview-exposure')).toHaveTextContent('$250.00');
    expect(screen.getByTestId('risk-preview-risk')).toHaveTextContent('$10.00');
    expect(screen.getByTestId('risk-preview-post-balance')).toHaveTextContent('$0.00');
    expect(screen.getByTestId('risk-preview-status')).toHaveTextContent('Listo para revisar');
  });

  it('shows FOREX risk as pending when stop loss is absent', () => {
    render(
      <RiskPreview
        selectedType="FOREX"
        accountBalance="250.00"
        binaryInvestment={null}
        forexLotSize="2"
        forexEntryPrice="1.25"
        forexStopLoss=""
      />,
    );

    expect(screen.getByTestId('risk-preview-exposure')).toHaveTextContent('$250.00');
    expect(screen.getByTestId('risk-preview-risk')).toHaveTextContent(
      'Pendiente: agregá stop loss',
    );
    expect(screen.getByTestId('risk-preview-pending')).toHaveTextContent(
      'Riesgo pendiente',
    );
    expect(screen.getByTestId('risk-preview-status')).toHaveTextContent('Riesgo pendiente');
  });

  it('warns when exposure exceeds the available balance', () => {
    render(
      <RiskPreview
        selectedType="FOREX"
        accountBalance="99.99"
        binaryInvestment={null}
        forexLotSize="1"
        forexEntryPrice="2"
        forexStopLoss="1.9"
      />,
    );

    expect(screen.getByTestId('risk-preview-exposure')).toHaveTextContent('$200.00');
    expect(screen.getByTestId('risk-preview-post-balance')).toHaveTextContent('-$100.01');
    expect(screen.getByTestId('risk-preview-insufficient')).toHaveTextContent(
      'Exposición mayor al balance disponible',
    );
    expect(screen.getByTestId('risk-preview-status')).toHaveTextContent('Balance insuficiente');
  });
});
