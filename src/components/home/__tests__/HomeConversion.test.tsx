import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CtaStrip } from '../CtaStrip';
import { FeaturesGrid } from '../FeaturesGrid';
import { Hero } from '../Hero';

describe('public conversion surfaces', () => {
  it('exposes a clear hero and primary registration path', () => {
    render(
      <MemoryRouter>
        <Hero preview={<div>Workspace preview</div>} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('public-hero')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Registrarse' })).toHaveAttribute('href', '/register');
    expect(screen.getByText('Workspace preview')).toBeInTheDocument();
  });

  it('renders benefits and a final conversion CTA', () => {
    render(
      <MemoryRouter>
        <FeaturesGrid />
        <CtaStrip />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('public-features')).toBeInTheDocument();
    expect(screen.getByText('Claridad para cada decisión')).toBeInTheDocument();
    expect(screen.getByTestId('public-cta')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Registrarse' })).toHaveLength(1);
  });
});
