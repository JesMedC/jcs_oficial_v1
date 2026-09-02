/*
 * portal-fase0a-base — DeleteAccountDialog UI tests.
 *
 * Regression for the confirm-button copy: the visible button text must
 * be the literal "Eliminar cuenta" without appending the account name.
 * The name still appears in:
 *   - the modal title (`Eliminar cuenta: <name>`),
 *   - the aria-label of the submit button (for screen readers),
 *   - the modal body text.
 *
 * The button text is the only place we explicitly drop the name —
 * redundancy with the title is visual noise.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DeleteAccountDialog } from '../DeleteAccountDialog';
import type { AccountOut } from '../../../features/accounts/types';

vi.mock('../../../features/accounts/api', () => ({
  deleteAccountApi: vi.fn(async () => undefined),
}));

import { deleteAccountApi } from '../../../features/accounts/api';

const mockedDelete = deleteAccountApi as unknown as ReturnType<typeof vi.fn>;

function makeAccount(overrides: Partial<AccountOut> = {}): AccountOut {
  return {
    id: 'acc-1',
    user_id: 'u-1',
    broker_name: 'Pocket Option',
    type: 'BINARY',
    name: 'Binarias 1',
    balance_usd: '100.00',
    created_at: '2026-09-02T15:00:00Z',
    updated_at: '2026-09-02T15:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  mockedDelete.mockClear();
  mockedDelete.mockResolvedValue(undefined);
});

describe('DeleteAccountDialog — submit button copy', () => {
  it('shows the account name in the modal title but NOT on the submit button', () => {
    const account = makeAccount();
    render(
      <DeleteAccountDialog
        open
        account={account}
        onClose={() => undefined}
        onDeleted={() => undefined}
      />,
    );

    // Title keeps the name (it's the visual identifier for the user).
    expect(
      screen.getByRole('dialog', { name: `Eliminar cuenta: ${account.name}` }),
    ).toBeInTheDocument();

    // Submit button: visible text is just "Eliminar cuenta" — the
    // accessible name (via aria-label) keeps the full phrasing for
    // screen readers, but the rendered text drops the name.
    const submit = screen.getByRole('button', {
      name: `Eliminar cuenta ${account.name}`,
    });
    expect(submit).toBeInTheDocument();
    expect(submit.textContent).toBe('Eliminar cuenta');
    expect(submit.textContent ?? '').not.toContain(account.name);
  });

  it('submit button (data-testid="delete-confirm") drops the account name from text but keeps it in aria-label', () => {
    const account = makeAccount();
    render(
      <DeleteAccountDialog
        open
        account={account}
        onClose={() => undefined}
        onDeleted={() => undefined}
      />,
    );

    const button = screen.getByTestId('delete-confirm');
    expect(button).toHaveTextContent('Eliminar cuenta');
    expect(button.textContent ?? '').not.toContain(account.name);
    expect(button).toHaveAttribute(
      'aria-label',
      `Eliminar cuenta ${account.name}`,
    );
  });

  it('disables the submit button until the user types ELIMINAR', async () => {
    const account = makeAccount();
    const user = userEvent.setup();
    render(
      <DeleteAccountDialog
        open
        account={account}
        onClose={() => undefined}
        onDeleted={() => undefined}
      />,
    );

    const submit = screen.getByRole('button', {
      name: `Eliminar cuenta ${account.name}`,
    });
    expect(submit).toBeDisabled();

    const input = screen.getByPlaceholderText('ELIMINAR');
    await user.type(input, 'ELIMINAR');

    expect(submit).toBeEnabled();
  });

  it('calls deleteAccountApi with the literal confirmation word on submit', async () => {
    const account = makeAccount();
    const onDeleted = vi.fn();
    const user = userEvent.setup();
    render(
      <DeleteAccountDialog
        open
        account={account}
        onClose={() => undefined}
        onDeleted={onDeleted}
      />,
    );

    await user.type(screen.getByPlaceholderText('ELIMINAR'), 'ELIMINAR');
    await user.click(
      screen.getByRole('button', {
        name: `Eliminar cuenta ${account.name}`,
      }),
    );

    expect(mockedDelete).toHaveBeenCalledTimes(1);
    expect(mockedDelete).toHaveBeenCalledWith(account.id, 'ELIMINAR');
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it('renders the in-flight label "Eliminando..." while submitting', async () => {
    const account = makeAccount();
    // Hang the API promise so we can observe the in-flight label.
    mockedDelete.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 50)),
    );
    const user = userEvent.setup();
    render(
      <DeleteAccountDialog
        open
        account={account}
        onClose={() => undefined}
        onDeleted={() => undefined}
      />,
    );

    await user.type(screen.getByPlaceholderText('ELIMINAR'), 'ELIMINAR');
    await user.click(
      screen.getByRole('button', {
        name: `Eliminar cuenta ${account.name}`,
      }),
    );

    // The visible label flips to "Eliminando..." while the request is
    // in flight (the aria-label stays static for screen-reader continuity).
    expect(await screen.findByText('Eliminando...')).toBeInTheDocument();
  });
});
