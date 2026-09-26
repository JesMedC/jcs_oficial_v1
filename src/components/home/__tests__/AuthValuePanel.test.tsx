import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthValuePanel } from '../AuthValuePanel';

describe('AuthValuePanel', () => {
  it('renders trust copy, benefits, and the cross-auth navigation link', () => {
    render(
      <MemoryRouter>
        <AuthValuePanel
          eyebrow="Acceso seguro"
          title="Bienvenido"
          description="Entrá a tu workspace."
          panelTitle="Protección"
          benefits={['Beneficio uno', 'Beneficio dos']}
          footerText="¿Primera vez?"
          footerLinkLabel="Registrate"
          footerTo="/register"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Acceso seguro')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument();
    expect(screen.getByText('Beneficio uno')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Registrate' })).toHaveAttribute('href', '/register');
  });
});
