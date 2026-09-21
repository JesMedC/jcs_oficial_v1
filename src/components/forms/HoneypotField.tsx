/*
 * p0a.2 — honeypot field for the register form (R2 Risk).
 *
 * Bots that auto-fill forms typically fill every input they find,
 * including hidden ones. By rendering a field that LOOKS like a
 * legitimate input (name="website") but is positioned off-screen
 * via absolute positioning + `tabindex=-1`, we get a reliable
 * signal that the submitter is not human.
 *
 * The component is presentational; it registers with the parent
 * RHF context via `useFormContext`. The validation lives in the
 * form's zod schema (see `register/schema.ts`) where any non-empty
 * value fails with `spam_detected`. The form treats that error
 * as a silent abort — the user sees no feedback, the request is
 * never sent.
 */
import { useFormContext } from 'react-hook-form';

export function HoneypotField() {
  const { register } = useFormContext();
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '-10000px',
        top: 'auto',
        width: 1,
        height: 1,
        overflow: 'hidden',
      }}
    >
      <label htmlFor="website-honeypot">No completar este campo</label>
      <input
        id="website-honeypot"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        {...register('website')}
      />
    </div>
  );
}
