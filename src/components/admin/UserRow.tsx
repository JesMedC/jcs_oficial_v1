/*
 * p0b.2 — UserRow.
 *
 * One row of the admin users table. Renders email, name, role, the
 * latest subscription tier+status, an active/inactive badge and the
 * enable/disable action button. The disable action is disabled when
 * the row represents the signed-in admin (cannot deactivate self —
 * mirrors the backend `CannotDeactivateSelfError`).
 */
import { useAuth } from '../../features/auth/useAuth';
import { STATUS_BADGE, type UserWithSubscription } from '../../features/admin/types';

interface UserRowProps {
  readonly user: UserWithSubscription;
  readonly busy: boolean;
  readonly onToggleActive: () => void;
}

export function UserRow({ user, busy, onToggleActive }: UserRowProps) {
  const { user: me } = useAuth();
  const isSelf = me !== null && me.user_id === user.id;
  const sub = user.current_subscription;
  const tierLabel = sub === null ? '—' : sub.tier.charAt(0) + sub.tier.slice(1).toLowerCase();
  const statusBadge = sub === null ? null : STATUS_BADGE[sub.status];

  return (
    <tr className="border-t border-primary/10 hover:bg-surface/40 transition-colors">
      <td className="px-4 py-3 font-mono text-text-primary text-xs">{user.email}</td>
      <td className="px-4 py-3 text-text-primary font-body text-sm">{user.first_name}</td>
      <td className="px-4 py-3 text-text-primary font-body text-sm">{user.last_name}</td>
      <td className="px-4 py-3 font-display uppercase tracking-wide text-text-secondary text-xs">
        {user.role}
      </td>
      <td className="px-4 py-3 font-body text-sm">
        {sub === null ? (
          <span className="text-text-muted">Sin suscripcion</span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <span className="text-primary font-display uppercase tracking-wide text-xs">
              {tierLabel}
            </span>
            {statusBadge !== null ? (
              <span
                className={[
                  'inline-flex items-center px-2 py-0.5 rounded-full font-display uppercase tracking-wide text-[10px] border',
                  statusBadge.className,
                ].join(' ')}
              >
                {statusBadge.label}
              </span>
            ) : null}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={[
            'inline-flex items-center px-2 py-0.5 rounded-full font-display uppercase tracking-wide text-[10px] border',
            user.is_active
              ? 'bg-profit/15 text-profit border-profit/40'
              : 'bg-loss/15 text-loss border-loss/40',
          ].join(' ')}
        >
          {user.is_active ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {isSelf ? (
          <span
            className="text-text-muted font-body text-xs"
            title="No puedes desactivarte a ti mismo"
          >
            No puedes desactivarte
          </span>
        ) : (
          <button
            type="button"
            onClick={onToggleActive}
            disabled={busy}
            className={[
              'font-display uppercase tracking-wide text-xs px-3 py-1.5 rounded-lg transition-colors',
              user.is_active
                ? 'border border-loss/40 text-loss hover:bg-loss/10'
                : 'border border-profit/40 text-profit hover:bg-profit/10',
              busy ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
          >
            {busy ? '...' : user.is_active ? 'Desactivar' : 'Activar'}
          </button>
        )}
      </td>
    </tr>
  );
}
