/*
 * p0a.2 — register form schema (R1 Review + R2 Risk).
 *
 * Mirrors the backend `RegisterIn` pydantic schema (auth.py):
 *   name: 2-80 chars (server strips whitespace)
 *   email: valid email, max 254 chars on the server (we cap at 120
 *     to match the login form)
 *   password: min 8, must include at least one letter and one digit
 *   website: honeypot — must be empty. If the field is filled we
 *     treat the submission as spam and abort.
 *
 * R2 Risk: the honeypot is rendered off-screen via HoneypotField.
 * Any non-empty value fails client-side validation with a
 * `spam_detected` code that the form treats as a silent abort
 * (we never POST the credentials).
 */
import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(80, 'El nombre debe tener como maximo 80 caracteres'),
  email: z.string().email('Email invalido').max(120, 'Email demasiado largo'),
  password: z
    .string()
    .min(8, 'La contrasena debe tener al menos 8 caracteres')
    .max(200, 'La contrasena debe tener como maximo 200 caracteres')
    .regex(/[A-Za-z]/, 'La contrasena debe incluir al menos una letra')
    .regex(/[0-9]/, 'La contrasena debe incluir al menos un digito'),
  website: z.string().max(0, 'spam_detected').optional().default(''),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
