/*
 * p0ui.1 — Glass showcase / styleguide page.
 *
 * Visual validation route for the new glass tokens + GlassPanel /
 * GlassCard / GlassModal primitives. Goal: let a human eyeball the
 * tones, blurs, borders, top-edge highlight, hover-glow, and the
 * modal layering BEFORE we touch any of the 10+ existing components
 * in p0ui.2.
 *
 * Sections:
 *   1. 3×3 grid: every (variant × blur) combination visible.
 *   2. 4 GlassCards: padding variants + glow-on-hover cards. Each
 *      has account-style content (name, balance, action).
 *   3. Modal trigger + live GlassModal demo with form-like content.
 *
 * Background: full-viewport aurora-static + portal-selector so the
 * panels render AGAINST a coloured backdrop — that's the only way to
 * see the translucency effect. Without a colourful backdrop, glass
 * just looks like a slightly tinted rectangle.
 */
import { useState } from 'react';

import { GlassCard } from '../components/common/GlassCard';
import { GlassModal } from '../components/common/GlassModal';
import { GlassPanel, type GlassBlur, type GlassVariant } from '../components/common/GlassPanel';

type VariantTuple = readonly [GlassVariant, GlassBlur];

const VARIANTS: readonly GlassVariant[] = ['subtle', 'default', 'strong'];
const BLURS: readonly GlassBlur[] = ['sm', 'default', 'lg'];

// 3×3 grid: columns = variant, rows = blur, so each cell is unique.
const GRID: readonly VariantTuple[] = BLURS.flatMap((blur) =>
  VARIANTS.map((variant) => [variant, blur] as const),
);

function PanelCell({ variant, blur }: { readonly variant: GlassVariant; readonly blur: GlassBlur }) {
  return (
    <GlassPanel variant={variant} blur={blur} className="h-32 flex items-center justify-center">
      <div className="text-center text-text-secondary text-xs font-mono">
        <div className="text-text-primary text-sm">v: {variant}</div>
        <div className="mt-1">blur: {blur}</div>
      </div>
    </GlassPanel>
  );
}

function AccountMockCard({
  name,
  balance,
  glow,
}: {
  readonly name: string;
  readonly balance: string;
  // portal-fase0a-base — glow prop token pivoted (cyan -> jade) to
  // match the renamed GlassCardGlow union in src/components/common/GlassCard.tsx.
  readonly glow: 'jade' | 'none';
}) {
  return (
    <GlassCard glow={glow} variant="default" className="space-y-3">
      <div className="font-display uppercase tracking-wide text-primary text-sm">{name}</div>
      <div className="font-mono text-text-primary text-2xl">{balance}</div>
      <div className="flex items-center justify-between gap-2 pt-2">
        <span className="text-text-muted font-body text-xs">Broker demo</span>
        <button
          type="button"
          className="font-display uppercase tracking-wide text-xs border border-primary/40 text-primary px-3 py-1 rounded-lg hover:bg-primary/10 transition-colors"
        >
          Operar
        </button>
      </div>
    </GlassCard>
  );
}

export function GlassShowcase() {
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-aurora-static bg-portal-selector">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-16 space-y-12">
        <header className="space-y-2">
          <div className="font-display uppercase tracking-[0.3em] text-primary text-xs">
            p0ui.1 / Glassmorphism foundation
          </div>
          <h1
            className="font-display uppercase tracking-wide text-text-primary text-2xl md:text-4xl"
            style={{ textShadow: '0 0 24px rgba(0,255,255,0.35)' }}
          >
            Glass tokens &amp; primitives
          </h1>
          <p className="text-text-secondary font-body text-sm md:text-base max-w-2xl">
            Validacion visual de los nuevos tokens (colors.glass, backdropBlur.glass-*,
            borderRadius.glass, shadow.glass-panel) y los primitivos GlassPanel,
            GlassCard y GlassModal. Aplicar selectivamente en chrome: sidebar, modals,
            account cards, topbar.
          </p>
        </header>

        {/* Section 1: 3×3 panel grid */}
        <section className="space-y-4">
          <h2 className="font-display uppercase tracking-wide text-primary text-base md:text-lg">
            1. GlassPanel — variant × blur
          </h2>
          <p className="text-text-muted font-body text-xs md:text-sm">
            3 opacidades × 3 niveles de blur = 9 paneles. Backdrop aurora detras para
            confirmar la translucidez.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {GRID.map(([variant, blur], idx) => (
              <PanelCell key={`${variant}-${blur}-${idx}`} variant={variant} blur={blur} />
            ))}
          </div>
        </section>

        {/* Section 2: GlassCards */}
        <section className="space-y-4">
          <h2 className="font-display uppercase tracking-wide text-primary text-base md:text-lg">
            2. GlassCard — padding + glow
          </h2>
          <p className="text-text-muted font-body text-xs md:text-sm">
            4 cards: padding sm/md/lg y dos con glow cyan (hover para ver el halo).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard padding="sm" variant="strong">
              <div className="space-y-2">
                <div className="font-display uppercase tracking-wide text-text-secondary text-xs">
                  padding sm
                </div>
                <div className="font-display uppercase tracking-wide text-primary text-base">
                  Cuenta FX
                </div>
                <div className="font-mono text-text-primary text-lg">$12,480.00</div>
              </div>
            </GlassCard>

            <AccountMockCard name="Cuenta PRO" balance="$48,920.55" glow="none" />

            <AccountMockCard name="Cuenta con glow" balance="$7,330.10" glow="jade" />

            <GlassCard padding="lg" variant="default">
              <div className="space-y-3">
                <div className="font-display uppercase tracking-wide text-text-secondary text-xs">
                  padding lg
                </div>
                <div className="font-display uppercase tracking-wide text-primary text-lg">
                  Resumen Diario
                </div>
                <div className="font-mono text-profit text-base">+$1,240.30</div>
                <p className="text-text-muted font-body text-xs leading-relaxed">
                  Card con padding generoso para contenido narrativo mas largo.
                </p>
                <button
                  type="button"
                  className="font-display uppercase tracking-wide text-xs border border-primary/40 text-primary px-3 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                >
                  Ver detalle
                </button>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Section 3: Modal */}
        <section className="space-y-4">
          <h2 className="font-display uppercase tracking-wide text-primary text-base md:text-lg">
            3. GlassModal
          </h2>
          <p className="text-text-muted font-body text-xs md:text-sm">
            Apertura via boton. Hoverea los inputs (no son el foco de este slice —
            quedan fuera del scope glass).
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="font-display uppercase tracking-wide text-sm bg-primary text-bg px-5 py-2 rounded-lg hover:shadow-glow-jade-sm transition-shadow"
          >
            Abrir GlassModal
          </button>
          <GlassModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Ejemplo de GlassModal"
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="font-display uppercase tracking-wide border border-primary/30 text-primary px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="font-display uppercase tracking-wide bg-primary text-bg px-4 py-2 rounded-lg hover:shadow-glow-jade-sm transition-shadow text-sm"
                >
                  Confirmar
                </button>
              </>
            }
          >
            <form className="space-y-3">
              <label className="flex flex-col gap-1">
                <span className="font-display uppercase tracking-wide text-xs text-text-muted">
                  Nombre
                </span>
                <input
                  type="text"
                  placeholder="Cuenta ejemplo"
                  className="bg-surface-el/50 border border-primary/30 rounded-lg px-3 py-2 text-text-primary font-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-display uppercase tracking-wide text-xs text-text-muted">
                  Broker
                </span>
                <input
                  type="text"
                  placeholder="IC Markets"
                  className="bg-surface-el/50 border border-primary/30 rounded-lg px-3 py-2 text-text-primary font-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-display uppercase tracking-wide text-xs text-text-muted">
                  Balance inicial (USD)
                </span>
                <input
                  type="number"
                  placeholder="0.00"
                  className="bg-surface-el/50 border border-primary/30 rounded-lg px-3 py-2 text-text-primary font-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
            </form>
          </GlassModal>
        </section>

        <footer className="pt-8 border-t border-primary/20 text-text-muted font-body text-xs">
          p0ui.1 — preview tool. p0ui.2 will replace individual components with these primitives.
        </footer>
      </div>
    </div>
  );
}

export default GlassShowcase;
