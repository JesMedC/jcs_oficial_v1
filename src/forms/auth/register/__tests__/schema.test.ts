/*
 * p0b.1b — register form schema tests (8 cases).
 *
 * Covers:
 *   1. happy path (all valid)
 *   2. first_name too short
 *   3. last_name has digits
 *   4. phone missing + (accepted by regex, but checks phone min length)
 *   5. password no letter
 *   6. password no digit
 *   7. passwords mismatch
 *   8. honeypot filled (website)
 *
 * R1 Review: every constraint surfaces a Spanish error message.
 */
import { describe, expect, it } from 'vitest';

import { registerSchema } from '../schema';

const validPayload = {
  first_name: 'Juana',
  last_name: 'Perez',
  phone: '+54 11 1234 5678',
  email: 'juana@example.com',
  password: 'secret123',
  repeat_password: 'secret123',
  website: '',
};

describe('registerSchema', () => {
  it('accepts a valid payload (happy path)', () => {
    const result = registerSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.first_name).toBe('Juana');
      expect(result.data.website).toBe('');
    }
  });

  it('rejects first_name shorter than 2 characters', () => {
    const result = registerSchema.safeParse({ ...validPayload, first_name: 'J' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const firstNameIssue = result.error.issues.find((i) => i.path[0] === 'first_name');
      expect(firstNameIssue?.message).toBe('Minimo 2 caracteres');
    }
  });

  it('rejects last_name containing digits', () => {
    const result = registerSchema.safeParse({ ...validPayload, last_name: 'Perez123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const lastNameIssue = result.error.issues.find((i) => i.path[0] === 'last_name');
      expect(lastNameIssue?.message).toBe('Solo letras y espacios');
    }
  });

  it('rejects phone that is too short', () => {
    const result = registerSchema.safeParse({ ...validPayload, phone: '+12' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const phoneIssue = result.error.issues.find((i) => i.path[0] === 'phone');
      expect(phoneIssue?.message).toBe('Telefono invalido');
    }
  });

  it('rejects password without any letter', () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      password: '12345678',
      repeat_password: '12345678',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordIssue = result.error.issues.find((i) => i.path[0] === 'password');
      expect(passwordIssue?.message).toBe('Debe incluir al menos una letra');
    }
  });

  it('rejects password without any digit', () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      password: 'secretOnly',
      repeat_password: 'secretOnly',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordIssue = result.error.issues.find((i) => i.path[0] === 'password');
      expect(passwordIssue?.message).toBe('Debe incluir al menos un digito');
    }
  });

  it('rejects when repeat_password does not match password', () => {
    const result = registerSchema.safeParse({ ...validPayload, repeat_password: 'different123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const repeatIssue = result.error.issues.find((i) => i.path[0] === 'repeat_password');
      expect(repeatIssue?.message).toBe('Las contrasenas no coinciden');
    }
  });

  it('rejects when honeypot `website` is filled', () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      website: 'https://spam.example.com',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const websiteIssue = result.error.issues.find((i) => i.path[0] === 'website');
      expect(websiteIssue?.message).toBe('spam_detected');
    }
  });
});
