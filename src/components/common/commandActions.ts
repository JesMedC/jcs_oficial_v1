/*
 * portal-fase0a-base — declarative list of command-palette actions.
 *
 * The `run` callback receives a small adapter so the action can stay
 * a pure data structure (testable) and the side effects happen at
 * dispatch time.
 */

export interface CommandActionApi {
  readonly navigate: (to: string) => void;
  readonly openTradeDrawer: () => void;
  readonly logout: () => void;
}

export interface CommandAction {
  readonly id: string;
  readonly label: string;
  readonly group: 'navigation' | 'actions';
  readonly shortcut?: string;
  run: (api: CommandActionApi) => void;
}

export const COMMAND_ACTIONS: ReadonlyArray<CommandAction> = [
  {
    id: 'nav.dashboard',
    label: 'Ir a Dashboard',
    group: 'navigation',
    run: (api) => api.navigate('/portal/dashboard'),
  },
  {
    id: 'nav.cuentas',
    label: 'Ir a Cuentas',
    group: 'navigation',
    run: (api) => api.navigate('/portal/cuentas'),
  },
  {
    id: 'nav.operaciones',
    label: 'Ir a Operaciones',
    group: 'navigation',
    run: (api) => api.navigate('/portal/operaciones'),
  },
  {
    id: 'nav.diario',
    label: 'Ir a Diario',
    group: 'navigation',
    run: (api) => api.navigate('/portal/diario'),
  },
  {
    id: 'nav.playbook',
    label: 'Ir a Playbook',
    group: 'navigation',
    run: (api) => api.navigate('/portal/playbook'),
  },
  {
    id: 'nav.configuracion',
    label: 'Ir a Configuracion',
    group: 'navigation',
    run: (api) => api.navigate('/portal/configuracion'),
  },
  {
    id: 'trade.new',
    label: 'Abrir Nuevo Trade',
    group: 'actions',
    shortcut: '+ Nuevo Trade',
    run: (api) => api.openTradeDrawer(),
  },
  {
    id: 'auth.logout',
    label: 'Cerrar sesion',
    group: 'actions',
    run: (api) => api.logout(),
  },
];
