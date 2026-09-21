/*
 * p0a.2 — login form schema (R1 Review).
 *
 * Mirrors the backend `LoginIn` pydantic schema (auth.py):
 *   email: required, must be a valid email, max 120 chars
 *   password: required, 1-200 chars (server enforces max 128 but
 *     we cap at 200 to match the register form's generosity and
 *     avoid rejecting long test fixtures).
 *
 * R3 Reliability: messages are Spanish per mem #68. Codes are not
 * surfaced here — they live in the backend envelope for the support
 * team to log.
 */
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email invalido').max(120, 'Email demasiado largo'),
  password: z.string().min(1, 'Contrasena requerida').max(200, 'Contrasena demasiado larga'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
