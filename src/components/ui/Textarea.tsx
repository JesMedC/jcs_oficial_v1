/*
 * design-system-v1 — Textarea primitive (Wave 4a, T4a.4).
 *
 * Foundational multi-line text control. Mirrors Input's field chrome
 * (label / hint / error) but renders a native <textarea> with a
 * vertical-only resize handle.
 *
 * Composition (per `design.md` §4.4):
 *   - textarea: `w-full bg-input border border-primary/30 rounded-lg
 *     px-3 py-2 text-text-primary font-body resize-y transition-shadow
 *     focus:outline-none focus:border-primary
 *     focus:shadow-[0_0_5px_rgba(0,255,157,0.5)]`
 *   - error:  `border-loss focus:border-loss
 *     focus:shadow-[0_0_5px_rgba(255,42,85,0.5)]`
 *   - disabled: `opacity-50 cursor-not-allowed`
 *   - rows defaults to 4 when caller omits it (matches the field
 *     density used by the pre-existing forms — LoginForm/RegisterForm
 *     pre_trade_notes uses rows=3; the default of 4 is the "comfortable
 *     reading" baseline)
 *
 * Accessibility:
 *   - label / hint / error wiring identical to Input (htmlFor ↔ id,
 *     aria-invalid, aria-describedby)
 *   - native <textarea> retains its platform keyboard semantics
 *
 * `forwardRef<HTMLTextAreaElement>` so React Hook Form's
 * `register('fieldName')` can target the textarea element.
 */
import {
  forwardRef,
  useId,
  type TextareaHTMLAttributes,
} from 'react';

export interface TextareaProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    'className' | 'rows'
  > {
  readonly label?: string;
  readonly hint?: string;
  readonly error?: string;
  readonly inputClassName?: string;
  readonly rows?: number;
}

const BASE_TEXTAREA_CLASSES =
  'w-full bg-input border border-primary/30 rounded-lg px-3 py-2 text-text-primary font-body resize-y transition-shadow focus:outline-none focus:border-primary focus:shadow-[0_0_5px_rgba(0,255,157,0.5)]';

const ERROR_TEXTAREA_CLASSES =
  'border-loss focus:border-loss focus:shadow-[0_0_5px_rgba(255,42,85,0.5)]';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(props, ref) {
    const {
      id,
      label,
      hint,
      error,
      disabled,
      inputClassName,
      rows = 4,
      ...rest
    } = props;

    const reactId = useId();
    const fieldId = id ?? `textarea-${reactId}`;
    const hasError = error !== undefined && error !== '';

    const describedBy = hasError
      ? `${fieldId}-error`
      : hint !== undefined && hint !== ''
        ? `${fieldId}-hint`
        : undefined;

    const textareaClasses = [
      BASE_TEXTAREA_CLASSES,
      hasError ? ERROR_TEXTAREA_CLASSES : null,
      disabled ? 'opacity-50 cursor-not-allowed' : null,
      inputClassName,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="flex flex-col">
        {label !== undefined && label !== '' ? (
          <label
            htmlFor={fieldId}
            className="text-text-secondary text-xs uppercase tracking-wide font-display mb-1"
          >
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          data-testid={`textarea-${fieldId}`}
          className={textareaClasses}
          {...rest}
        />
        {hasError ? (
          <p
            id={`${fieldId}-error`}
            role="alert"
            className="text-loss text-xs mt-1"
          >
            {error}
          </p>
        ) : hint !== undefined && hint !== '' ? (
          <p id={`${fieldId}-hint`} className="text-text-muted text-xs mt-1">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);