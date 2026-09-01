/*
 * p0c — TopPageRow.
 *
 * Una fila de la tabla "Paginas mas visitadas" del admin. Muestra la
 * ruta, conteo de vistas, usuarios unicos, anonimos unicos y la
 * ultima visita.
 */
import type { TopPageOut } from '../../features/analytics/types';

interface TopPageRowProps {
  readonly page: TopPageOut;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function TopPageRow({ page }: TopPageRowProps) {
  return (
    <tr className="border-t border-primary/10 hover:bg-surface/40 transition-colors">
      <td className="px-4 py-3 font-mono text-text-primary text-xs">{page.page_path}</td>
      <td className="px-4 py-3 text-text-primary font-display text-sm text-right">
        {page.views_count.toLocaleString('es-ES')}
      </td>
      <td className="px-4 py-3 text-primary font-display text-sm text-right">
        {page.unique_users_count.toLocaleString('es-ES')}
      </td>
      <td className="px-4 py-3 text-text-secondary font-display text-sm text-right">
        {page.unique_anonymous_count.toLocaleString('es-ES')}
      </td>
      <td className="px-4 py-3 text-text-muted font-body text-xs">
        {formatDate(page.last_viewed_at)}
      </td>
    </tr>
  );
}
