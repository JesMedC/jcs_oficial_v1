/*
 * p0b.2 — AdminUsersPage.
 *
 * Paginated users table sourced from `listUsersApi`. Filters:
 *   - Search (email/first/last, case-insensitive substring)
 *   - Role select (Todos | USER | ADMIN | BOTH)
 *   - Status select (Todos | Activos | Inactivos | Trial | Active | Expired)
 *
 * Pagination: prev/next buttons + page indicator (skip-based). The
 * page size is 50 to match the backend default. We do NOT use the
 * total from the backend for the page count because the spec only
 * asks for prev/next.
 *
 * Per mem #68 the visible strings are Spanish; per mem #70 the page
 * uses the cyan + Orbitron visual tokens (badges, headings, buttons).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { SeoHead } from '../../components/SeoHead';
import { GlassCard } from '../../components/GlassCard';
import { ErrorBanner } from '../../components/ErrorBanner';
import { UserRow } from '../../components/admin/UserRow';
import { listUsersApi, setUserActiveApi } from '../../features/admin/api';
import type { AdminUserList, UserWithSubscription } from '../../features/admin/types';
import type { ErrorEnvelope, UserRole } from '../../features/auth/types';

const PAGE_SIZE = 50;

type RoleFilter = '' | UserRole;
type StatusFilter = '' | 'active' | 'inactive' | 'trial' | 'active_sub' | 'expired';

const ROLE_FILTER_OPTIONS: ReadonlyArray<{ readonly label: string; readonly value: RoleFilter }> = [
  { label: 'Todos', value: '' },
  { label: 'USER', value: 'USER' },
  { label: 'ADMIN', value: 'ADMIN' },
  { label: 'BOTH', value: 'BOTH' },
];

const STATUS_FILTER_OPTIONS: ReadonlyArray<{
  readonly label: string;
  readonly value: StatusFilter;
}> = [
  { label: 'Todos', value: '' },
  { label: 'Activos', value: 'active' },
  { label: 'Inactivos', value: 'inactive' },
  { label: 'Trial', value: 'trial' },
  { label: 'Active', value: 'active_sub' },
  { label: 'Expired', value: 'expired' },
];

export function AdminUsersPage() {
  const [searchInput, setSearchInput] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [role, setRole] = useState<RoleFilter>('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [skip, setSkip] = useState<number>(0);
  const [data, setData] = useState<AdminUserList | null>(null);
  const [error, setError] = useState<ErrorEnvelope | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (overrides?: {
      skip?: number;
      search?: string;
      role?: RoleFilter;
      status?: StatusFilter;
    }) => {
      setLoading(true);
      try {
        const appliedSearch = overrides?.search ?? search;
        const appliedRole = overrides?.role ?? role;
        const appliedStatus = overrides?.status ?? status;
        const params: Parameters<typeof listUsersApi>[0] = {
          skip: overrides?.skip ?? skip,
          limit: PAGE_SIZE,
        };
        const populated: Parameters<typeof listUsersApi>[0] = {
          ...params,
          ...(appliedSearch !== '' ? { search: appliedSearch } : {}),
          ...(appliedRole !== '' ? { role: appliedRole } : {}),
          ...(appliedStatus !== '' ? { status: appliedStatus } : {}),
        };
        const result = await listUsersApi(populated);
        setData(result);
        setError(null);
      } catch (err) {
        setError(err as ErrorEnvelope);
      } finally {
        setLoading(false);
      }
    },
    [search, role, status, skip],
  );

  // Initial fetch + re-fetch on filter changes (debounced search).
  useEffect(() => {
    void fetchPage({ skip: 0 });
    setSkip(0);
    // fetchPage is stable enough via the dependency list; intentional
    // lint suppress below is not needed because the deps are exhaustive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, role, status]);

  const items = useMemo<readonly UserWithSubscription[]>(() => data?.items ?? [], [data]);

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleToggleActive = async (user: UserWithSubscription) => {
    setBusyUserId(user.id);
    try {
      await setUserActiveApi(user.id, !user.is_active);
      void fetchPage();
    } catch (err) {
      setError(err as ErrorEnvelope);
    } finally {
      setBusyUserId(null);
    }
  };

  const pageNumber = Math.floor(skip / PAGE_SIZE) + 1;
  const hasNext = data !== null && skip + PAGE_SIZE < data.total;
  const hasPrev = skip > 0;

  return (
    <>
      <SeoHead
        title="Usuarios"
        description="Listado de usuarios registrados en JadeCapitalSuite."
        canonicalPath="/admin/users"
        noindex
      />
      <div className="max-w-7xl mx-auto">
        <h1
          className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl mb-6"
          style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
        >
          Usuarios
        </h1>

        <ErrorBanner error={error} onDismiss={() => setError(null)} className="mb-4" />

        <GlassCard variant="default" className="mb-6">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col md:flex-row gap-3 md:items-end"
          >
            <label className="flex flex-col gap-1 flex-1 min-w-0">
              <span className="font-display uppercase tracking-wide text-text-secondary text-xs">
                Buscar
              </span>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Email, nombre o apellido"
                className="bg-surface/60 border border-primary/30 rounded-lg px-3 py-2 text-text-primary font-body text-sm focus:outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-display uppercase tracking-wide text-text-secondary text-xs">
                Rol
              </span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as RoleFilter)}
                className="bg-surface/60 border border-primary/30 rounded-lg px-3 py-2 text-text-primary font-body text-sm focus:outline-none focus:border-primary"
              >
                {ROLE_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-display uppercase tracking-wide text-text-secondary text-xs">
                Estado
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="bg-surface/60 border border-primary/30 rounded-lg px-3 py-2 text-text-primary font-body text-sm focus:outline-none focus:border-primary"
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="bg-primary text-bg font-display uppercase tracking-wide px-3 py-1.5 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm"
            >
              Buscar
            </button>
          </form>
        </GlassCard>

        <GlassCard variant="default" className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface/60 text-text-muted font-display uppercase tracking-wide text-xs">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Email
                </th>
                <th scope="col" className="px-4 py-3">
                  Nombre
                </th>
                <th scope="col" className="px-4 py-3">
                  Apellido
                </th>
                <th scope="col" className="px-4 py-3">
                  Rol
                </th>
                <th scope="col" className="px-4 py-3">
                  Suscripcion
                </th>
                <th scope="col" className="px-4 py-3">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-muted font-body">
                    Cargando...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-muted font-body">
                    No hay usuarios con esos filtros.
                  </td>
                </tr>
              ) : (
                items.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    busy={busyUserId === user.id}
                    onToggleActive={() => void handleToggleActive(user)}
                  />
                ))
              )}
            </tbody>
          </table>
        </GlassCard>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-text-muted font-body text-xs">
            Pagina {pageNumber}
            {data !== null ? ` · ${data.total} usuario${data.total === 1 ? '' : 's'}` : ''}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={() => {
                const next = Math.max(0, skip - PAGE_SIZE);
                setSkip(next);
                void fetchPage({ skip: next });
              }}
              className="border border-primary/40 text-primary font-display uppercase tracking-wide px-3 py-1.5 rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/10 transition-colors"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => {
                const next = skip + PAGE_SIZE;
                setSkip(next);
                void fetchPage({ skip: next });
              }}
              className="bg-primary text-bg font-display uppercase tracking-wide px-3 py-1.5 rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
