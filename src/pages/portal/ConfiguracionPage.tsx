/*
 * p0d.2 — Portal ConfiguracionPage.
 *
 * FASE 4C restructured the page into a tabbed surface so the user
 * can find what they need without scrolling:
 *
 *   - "Plan"     → subscription status, tier, renewal date + CTAs
 *   - "Activos"  → allowlist of instruments the platform supports
 *                  per market (FOREX / BINARY). The same list feeds
 *                  the pair picker in NewTradeForm so the settings
 *                  panel shows what the trader can actually pick.
 *   - "Preferencias" → placeholder for future preferences
 *
 * Identity (avatar + logout) lives in the SidebarFooter since FASE 4B,
 * so this page does NOT render any logout / display-name controls.
 */
import { SeoHead } from '../../components/SeoHead';
import { Tabs } from '../../components/ui/Tabs';
import { SubscriptionCard } from '../../features/subscription/SubscriptionCard';
import { cancelSubscription } from '../../features/subscription/api';
import { useAuth } from '../../features/auth/useAuth';
import type { ErrorEnvelope } from '../../features/auth/types';
import {
  AVAILABLE_FOREX_INSTRUMENTS,
  AVAILABLE_BINARY_INSTRUMENTS,
  INSTRUMENT_CATEGORY_LABEL,
  type InstrumentCategory,
  type InstrumentInfo,
} from '../../features/trades/availableInstruments';
import { useState } from 'react';

function PlanTab() {
  const { subscription } = useAuth();
  const [cancelError, setCancelError] = useState<ErrorEnvelope | null>(null);

  const handleCancel = async () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Seguro que queres cancelar tu suscripcion?')
    ) {
      return;
    }
    try {
      await cancelSubscription();
      // Force a re-fetch via auth refresh so the panel re-renders
      // with the new CANCELED status without a full page reload.
      window.location.reload();
    } catch (err) {
      setCancelError(err as ErrorEnvelope);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <SubscriptionCard subscription={subscription} />
      {subscription !== null && subscription.status === 'ACTIVE' ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleCancel()}
            data-testid="config-cancel-subscription"
            className="inline-flex items-center justify-center border border-loss/40 text-loss font-display uppercase tracking-wide px-3 py-1.5 rounded-lg hover:bg-loss/10 transition-colors text-sm"
          >
            Cancelar suscripcion
          </button>
        </div>
      ) : null}
      {cancelError !== null ? (
        <p className="text-loss font-body text-xs">{cancelError.message}</p>
      ) : null}
    </div>
  );
}

/* ----------------------------- Activos tab ----------------------------- */

function InstrumentChip({ instrument }: { readonly instrument: InstrumentInfo }) {
  const enabled = instrument.enabled;
  return (
    <div
      data-testid={`asset-${instrument.symbol}`}
      className={[
        'flex items-center gap-2 px-3 py-2 rounded-md border',
        enabled
          ? 'border-[rgba(0,255,157,0.30)] bg-[rgba(0,255,157,0.06)]'
          : 'border-[rgba(138,155,168,0.20)] bg-[rgba(138,155,168,0.04)]',
      ].join(' ')}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{
          backgroundColor: enabled ? '#00FF9D' : '#8A9BA8',
          boxShadow: enabled ? '0 0 6px #00FF9D' : 'none',
        }}
        aria-hidden="true"
      />
      <span
        className={[
          'font-mono text-sm font-medium uppercase tracking-wide',
          enabled ? 'text-white' : 'text-text-muted',
        ].join(' ')}
      >
        {instrument.symbol}
      </span>
      <span className="font-body text-[11px] text-text-muted truncate">
        {instrument.name}
      </span>
      {!enabled ? (
        <span className="font-display uppercase text-[9px] text-text-muted ml-auto">
          Pronto
        </span>
      ) : null}
    </div>
  );
}

function InstrumentGrid({
  list,
}: {
  readonly list: ReadonlyArray<InstrumentInfo>;
}) {
  // Group by category so the panel reads "Majors → Crosses → Exotics"
  // instead of one big blob of symbols.
  const byCategory = new Map<InstrumentCategory, InstrumentInfo[]>();
  for (const i of list) {
    const arr = byCategory.get(i.category) ?? [];
    arr.push(i);
    byCategory.set(i.category, arr);
  }
  const categories = Array.from(byCategory.keys());
  return (
    <div className="flex flex-col gap-4">
      {categories.map((cat) => {
        const items = byCategory.get(cat) ?? [];
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-display uppercase tracking-widest text-[10px] text-text-muted">
                {INSTRUMENT_CATEGORY_LABEL[cat]}
              </span>
              <span className="font-mono text-[10px] text-text-muted">
                ({items.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {items.map((instrument) => (
                <InstrumentChip
                  key={instrument.symbol}
                  instrument={instrument}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActivosTab() {
  const forexEnabled = AVAILABLE_FOREX_INSTRUMENTS.filter((i) => i.enabled).length;
  const binaryEnabled = AVAILABLE_BINARY_INSTRUMENTS.filter((i) => i.enabled).length;

  return (
    <div
      data-testid="tab-activos"
      className="flex flex-col gap-4 border border-[rgba(0,255,157,0.15)] rounded-xl bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] p-5 md:p-6 opacity-70"
    >
      <div>
        <h2 className="font-display uppercase tracking-wide text-base md:text-lg text-text-primary">
          Activos permitidos
        </h2>
        <p className="text-text-secondary font-body text-sm mt-2 max-w-2xl">
          Estos son los pares e instrumentos disponibles en la plataforma.
          Al abrir una operacion, el selector de par solo va a ofrecer los
          que figuren activos aca.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FF9D]"
            style={{ boxShadow: '0 0 6px #00FF9D' }}
            aria-hidden="true"
          />
          <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
            FOREX
          </span>
          <span className="font-mono text-[10px] text-text-muted">
            {forexEnabled} activos disponibles
          </span>
        </div>
        <InstrumentGrid list={AVAILABLE_FOREX_INSTRUMENTS} />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-[#00B8FF]"
            style={{ boxShadow: '0 0 6px #00B8FF' }}
            aria-hidden="true"
          />
          <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
            BINARY
          </span>
          <span className="font-mono text-[10px] text-text-muted">
            {binaryEnabled} activos disponibles
          </span>
        </div>
        <InstrumentGrid list={AVAILABLE_BINARY_INSTRUMENTS} />
      </div>
    </div>
  );
}

/* ----------------------------- Preferencias tab ----------------------------- */

function PreferenciasTab() {
  return (
    <div className="border border-[rgba(0,255,157,0.15)] rounded-xl bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] p-6 opacity-70">
      <h2 className="font-display uppercase tracking-wide text-base md:text-lg">
        Preferencias
      </h2>
      <p className="text-text-secondary font-body text-sm mt-3">
        Próximamente — notificaciones, idioma, zona horaria y temas visuales.
      </p>
    </div>
  );
}

export function ConfiguracionPage() {
  return (
    <>
      <SeoHead
        title="Configuracion"
        description="Ajustes de cuenta y plan en JadeCapitalSuite."
        canonicalPath="/portal/configuracion"
        noindex
      />
      <div className="w-full px-2 md:px-4">
        <div className="py-4">
          <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
            Cuenta
          </span>
          <h1 className="font-display uppercase tracking-wide text-2xl md:text-3xl mt-1">
            Configuracion
          </h1>
          <p className="text-text-secondary font-body text-sm md:text-base mt-2 max-w-2xl">
            Gestioná tu plan, activos y preferencias.
          </p>
        </div>

        <div className="py-4">
          <Tabs
            ariaLabel="Secciones de configuracion"
            defaultActiveKey="plan"
            urlSyncKey="tab"
            items={[
              { key: 'plan', label: 'Plan', panel: <PlanTab /> },
              {
                key: 'activos',
                label: 'Activos',
                panel: <ActivosTab />,
              },
              {
                key: 'preferencias',
                label: 'Preferencias',
                panel: <PreferenciasTab />,
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
