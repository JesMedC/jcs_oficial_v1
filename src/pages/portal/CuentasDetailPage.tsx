/*
 * p0e.3 — Cuentas detail panel.
 *
 * Route: ``/portal/cuentas/:accountId`` (nested under ``PortalShell``
 * so it inherits the sidebar). Layout:
 *   - H1 with the account name (Orbitron uppercase, cyan glow)
 *   - Broker chip + "← Volver a Cuentas" link
 *   - 4 tabs: Resumen, Saldo, Operaciones, Zona de peligro
 *   - Active tab: cyan border-bottom + cyan text (matches portal
 *     sidebar active pattern from ``PortalSidebar.tsx``)
 *   - Tab state via ``useState<string>('resumen')`` + ``useSearchParams``
 *     so the URL persists the active tab (``?tab=saldo``)
 *
 * Tab content:
 *   - Resumen → GlassCard with broker / type / name / balance / created
 *   - Saldo → GlassCard with current balance + Fondear / Retirar buttons
 *     that open ``FundWithdrawModal``. After success, refetch account
 *     and update state.
 *   - Operaciones → GlassCard placeholder ("Próximamente") until Module C.
 *   - Zona de peligro → red-tinted GlassCard + delete button → opens
 *     ``DeleteAccountDialog``.
 *
 * 404 from ``getAccountById`` renders "Cuenta no encontrada" + back
 * link. Loading shows a small "Cargando cuenta..." message (the page
 * is dense enough that a skeleton would just be visual noise).
 *
 * Per mem #68, UI copy is Spanish. Per mem #70, visual language
 * matches the cyan + Orbitron + glassmorphism used elsewhere.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { SeoHead } from '../../components/SeoHead';
import { GlassCard } from '../../components/GlassCard';
import { ErrorBanner } from '../../components/ErrorBanner';
import { FundWithdrawModal } from '../../components/portal/FundWithdrawModal';
import { DeleteAccountDialog } from '../../components/portal/DeleteAccountDialog';
import { getAccountById } from '../../features/accounts/api';
import {
  ACCOUNT_TYPE_BADGE,
  type AccountOut,
} from '../../features/accounts/types';
import type { ErrorEnvelope } from '../../features/auth/types';

type TabId = 'resumen' | 'saldo' | 'operaciones' | 'peligro';

const TAB_IDS: ReadonlyArray<TabId> = ['resumen', 'saldo', 'operaciones', 'peligro'];
const TAB_LABELS: Record<TabId, string> = {
  resumen: 'Resumen',
  saldo: 'Saldo',
  operaciones: 'Operaciones',
  peligro: 'Zona de peligro',
};

function isTabId(value: string | null): value is TabId {
  return value !== null && (TAB_IDS as ReadonlyArray<string>).includes(value);
}

function formatUsd(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function formatLongDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });
}

export function CuentasDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab: TabId = isTabId(tabParam) ? tabParam : 'resumen';

  const [account, setAccount] = useState<AccountOut | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [error, setError] = useState<ErrorEnvelope | null>(null);
  const [fundOpen, setFundOpen] = useState<boolean>(false);
  const [withdrawOpen, setWithdrawOpen] = useState<boolean>(false);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);

  const fetchAccount = useCallback(
    (signal: { cancelled: boolean }) => {
      if (accountId === undefined) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      (async () => {
        try {
          const data = await getAccountById(accountId);
          if (signal.cancelled) return;
          setAccount(data);
          setNotFound(false);
          setError(null);
        } catch (err) {
          if (signal.cancelled) return;
          const envelope = err as ErrorEnvelope;
          if (envelope.code === 'NOT_FOUND') {
            setNotFound(true);
          } else {
            setError(envelope);
          }
        } finally {
          if (!signal.cancelled) setLoading(false);
        }
      })();
    },
    [accountId],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    setLoading(true);
    setNotFound(false);
    setError(null);
    fetchAccount(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [fetchAccount]);

  const handleTabChange = (next: TabId) => {
    if (next === activeTab) return;
    const newParams = new URLSearchParams(searchParams);
    if (next === 'resumen') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', next);
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleSuccess = (updated: AccountOut) => {
    setAccount(updated);
    setFundOpen(false);
    setWithdrawOpen(false);
  };

  const handleDeleted = () => {
    setDeleteOpen(false);
    navigate('/portal/cuentas', { replace: true });
  };

  if (loading) {
    return (
      <>
        <SeoHead title="Cuenta" noindex />
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-16">
          <p className="text-text-muted font-body">Cargando cuenta...</p>
        </div>
      </>
    );
  }

  if (notFound) {
    return (
      <>
        <SeoHead title="Cuenta no encontrada" noindex />
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-16">
          <h1
            className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl"
            style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
          >
            Cuenta no encontrada
          </h1>
          <p className="text-text-secondary font-body text-sm md:text-base mt-4">
            La cuenta que buscás no existe o ya fue eliminada.
          </p>
          <Link
            to="/portal/cuentas"
            className="inline-block mt-6 text-primary font-display uppercase tracking-wide text-sm hover:underline"
          >
            ← Volver a Cuentas
          </Link>
        </div>
      </>
    );
  }

  if (account === null) {
    return null;
  }

  const badge = ACCOUNT_TYPE_BADGE[account.type];

  return (
    <>
      <SeoHead title={account.name} noindex />
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <Link
          to="/portal/cuentas"
          className="text-primary font-display uppercase tracking-wide text-xs hover:underline"
        >
          ← Volver a Cuentas
        </Link>

        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <h1
            className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl"
            style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
          >
            {account.name}
          </h1>
          <span
            className={`inline-block border rounded-full px-2 py-0.5 text-xs font-display uppercase tracking-wide ${badge.className}`}
          >
            {badge.label}
          </span>
          <span className="inline-block border border-primary/30 rounded-full px-2 py-0.5 text-xs font-body text-text-secondary">
            {account.broker_name}
          </span>
        </div>

        <ErrorBanner error={error} onDismiss={() => setError(null)} className="mt-6 mb-2" />

        <nav
          className="mt-6 border-b border-primary/20 flex gap-1 overflow-x-auto"
          aria-label="Secciones de la cuenta"
        >
          {TAB_IDS.map((id) => {
            const isActive = id === activeTab;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleTabChange(id)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'px-4 py-2 font-display uppercase tracking-wide text-sm border-b-2 -mb-px transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-b-primary text-primary'
                    : 'border-b-transparent text-text-secondary hover:text-primary hover:border-b-primary/40',
                ].join(' ')}
              >
                {TAB_LABELS[id]}
              </button>
            );
          })}
        </nav>

        <div className="mt-6">
          {activeTab === 'resumen' ? <ResumenTab account={account} /> : null}
          {activeTab === 'saldo' ? (
            <SaldoTab
              account={account}
              onFund={() => setFundOpen(true)}
              onWithdraw={() => setWithdrawOpen(true)}
            />
          ) : null}
          {activeTab === 'operaciones' ? <OperacionesTab /> : null}
          {activeTab === 'peligro' ? (
            <ZonaPeligroTab account={account} onDelete={() => setDeleteOpen(true)} />
          ) : null}
        </div>
      </div>

      <FundWithdrawModal
        open={fundOpen}
        mode="fund"
        account={account}
        onClose={() => setFundOpen(false)}
        onSuccess={handleSuccess}
      />
      <FundWithdrawModal
        open={withdrawOpen}
        mode="withdraw"
        account={account}
        onClose={() => setWithdrawOpen(false)}
        onSuccess={handleSuccess}
      />
      <DeleteAccountDialog
        open={deleteOpen}
        account={account}
        onClose={() => setDeleteOpen(false)}
        onDeleted={handleDeleted}
      />
    </>
  );
}

interface ResumenTabProps {
  readonly account: AccountOut;
}

function ResumenTab({ account }: ResumenTabProps) {
  const badge = ACCOUNT_TYPE_BADGE[account.type];
  return (
    <GlassCard variant="default">
      <h2 className="font-display uppercase tracking-wide text-primary text-base md:text-lg mb-4">
        Resumen
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        <Row label="Broker" value={account.broker_name} />
        <Row
          label="Tipo"
          value={
            <span
              className={`inline-block border rounded-full px-2 py-0.5 text-xs font-display uppercase tracking-wide ${badge.className}`}
            >
              {badge.label}
            </span>
          }
        />
        <Row label="Nombre" value={account.name} />
        <Row label="Balance" value={formatUsd(account.balance_usd)} accent />
        <Row label="Creada" value={formatLongDate(account.created_at)} />
      </dl>
    </GlassCard>
  );
}

interface RowProps {
  readonly label: string;
  readonly value: React.ReactNode;
  readonly accent?: boolean;
}

function Row({ label, value, accent = false }: RowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-display uppercase tracking-wide text-xs text-text-muted">{label}</dt>
      <dd
        className={`font-body text-sm md:text-base ${
          accent ? 'text-primary text-2xl font-display tracking-wide' : 'text-text-primary'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

interface SaldoTabProps {
  readonly account: AccountOut;
  readonly onFund: () => void;
  readonly onWithdraw: () => void;
}

function SaldoTab({ account, onFund, onWithdraw }: SaldoTabProps) {
  return (
    <GlassCard variant="default">
      <h2 className="font-display uppercase tracking-wide text-primary text-base md:text-lg mb-4">
        Saldo
      </h2>
      <div className="flex items-baseline gap-3">
        <span className="font-display uppercase tracking-wide text-xs text-text-muted">
          Balance actual
        </span>
        <span
          className="font-display text-primary text-3xl tracking-wide"
          style={{ textShadow: '0 0 16px rgba(0,255,255,0.3)' }}
        >
          {formatUsd(account.balance_usd)}
        </span>
      </div>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onFund}
          className="inline-flex items-center justify-center bg-primary text-bg font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm"
        >
          Fondear
        </button>
        <button
          type="button"
          onClick={onWithdraw}
          className="inline-flex items-center justify-center border border-primary/40 text-primary font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors text-sm"
        >
          Retirar
        </button>
      </div>
      <p className="mt-4 text-text-muted font-body text-xs">
        Tip: usá valores con 2 decimales (0.01 — 99999999.99). El backend rechaza montos ≤ 0.
      </p>
    </GlassCard>
  );
}

function OperacionesTab() {
  return (
    <GlassCard variant="default">
      <h2 className="font-display uppercase tracking-wide text-primary text-base md:text-lg mb-4">
        Operaciones
      </h2>
      <p className="text-text-secondary font-body text-sm md:text-base">
        Próximamente — acá vas a ver las operaciones de esta cuenta (se habilita en el módulo de
        Operaciones).
      </p>
    </GlassCard>
  );
}

interface ZonaPeligroTabProps {
  readonly account: AccountOut;
  readonly onDelete: () => void;
}

function ZonaPeligroTab({ account, onDelete }: ZonaPeligroTabProps) {
  return (
    <GlassCard variant="default" className="border-loss/40">
      <h2 className="font-display uppercase tracking-wide text-loss text-base md:text-lg mb-2">
        Eliminar cuenta permanentemente
      </h2>
      <p className="text-text-secondary font-body text-sm md:text-base">
        Una vez eliminada, la cuenta ya no aparecerá en el listado ni podrá recibir
        fondeos o retiros. El historial de operaciones se conserva para tu journal.
      </p>
      <button
        type="button"
        onClick={onDelete}
        className="mt-6 inline-flex items-center justify-center bg-loss text-bg font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(255,92,92,0.5)] transition-shadow text-sm"
      >
        Eliminar cuenta "{account.name}"
      </button>
    </GlassCard>
  );
}
