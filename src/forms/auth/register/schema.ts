/*
 * p0b.1b — register form schema (R1 Review + R2 Risk).
 *
 * Mirrors the backend `RegisterIn` pydantic schema (auth.py after the
 * p0b.1a migration that split `name` → `first_name` + `last_name` and
 * added `phone`):
 *   first_name:      2-80 chars, letters and spaces only (Unicode letters allowed)
 *   last_name:       same as first_name
 *   phone:           7-20 chars, format `+? [0-9 spaces - ( )]` (e.g. +54 11 1234 5678)
 *   email:           valid email, max 120 chars
 *   password:        8-200 chars, must include at least one letter and one digit
 *   repeat_password: same value as `password` (validated in `.refine` below)
 *   website:         honeypot — must be empty. If the field is filled the
 *                    submission is treated as spam and the form aborts
 *                    silently (we never POST the credentials).
 *
 * R2 Risk: the honeypot is rendered off-screen via HoneypotField. Any
 * non-empty value fails client-side validation with a `spam_detected`
 * code that the form treats as a silent abort.
 *
 * Spanish error messages per mem #68. Codes stay in English for i18n
 * future-proofing.
 */
import { z } from 'zod';

const NAME_REGEX = /^[A-Za-zÀ-ÿ\s]+$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]+$/;

export const registerSchema = z
  .object({
    first_name: z
      .string()
      .min(2, 'Minimo 2 caracteres')
      .max(80, 'Maximo 80 caracteres')
      .regex(NAME_REGEX, 'Solo letras y espacios'),
    last_name: z
      .string()
      .min(2, 'Minimo 2 caracteres')
      .max(80, 'Maximo 80 caracteres')
      .regex(NAME_REGEX, 'Solo letras y espacios'),
    phone: z
      .string()
      .min(7, 'Telefono invalido')
      .max(20, 'Telefono muy largo')
      .regex(PHONE_REGEX, 'Formato invalido. Usa +54 11 1234 5678 o +1 555 1234567'),
    email: z.string().email('Email invalido').max(120, 'Email demasiado largo'),
    password: z
      .string()
      .min(8, 'Minimo 8 caracteres')
      .max(200, 'Maximo 200 caracteres')
      .regex(/[A-Za-z]/, 'Debe incluir al menos una letra')
      .regex(/[0-9]/, 'Debe incluir al menos un digito'),
    repeat_password: z.string().min(1, 'Confirma tu contrasena').max(200),
    website: z.string().max(0, 'spam_detected').optional().default(''),
  })
  .refine((data) => data.password === data.repeat_password, {
    message: 'Las contrasenas no coinciden',
    path: ['repeat_password'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
