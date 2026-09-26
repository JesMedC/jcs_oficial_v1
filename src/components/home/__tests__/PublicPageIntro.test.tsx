import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PublicPageIntro } from '../PublicPageIntro';

describe('PublicPageIntro', () => {
  it('renders conversion-oriented hierarchy with optional eyebrow', () => {
    render(
      <PublicPageIntro
        eyebrow="Todo conectado"
        title="Una plataforma más clara"
        description="Tomá mejores decisiones con contexto."
      />,
    );

    expect(screen.getByTestId('public-page-intro')).toBeInTheDocument();
    expect(screen.getByText('Todo conectado')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Una plataforma más clara' })).toBeInTheDocument();
    expect(screen.getByText('Tomá mejores decisiones con contexto.')).toBeInTheDocument();
  });
});
