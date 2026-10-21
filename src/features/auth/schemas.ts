import { z } from 'zod';

export const PASSWORD_MIN = 8;

/** Min 8 chars, at least one letter and one number. */
export function isValidPassword(pw: string): boolean {
  return pw.length >= PASSWORD_MIN && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong';

/** Score 0..1 plus a label for the animated strength meter. */
export function passwordStrength(pw: string): { score: number; label: PasswordStrength } {
  if (!pw) return { score: 0, label: 'empty' };
  let points = 0;
  if (pw.length >= PASSWORD_MIN) points++;
  if (pw.length >= 12) points++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) points++;
  if (/\d/.test(pw)) points++;
  if (/[^A-Za-z0-9]/.test(pw)) points++;
  if (!isValidPassword(pw) || points <= 2)
    return { score: Math.max(0.15, points * 0.12), label: 'weak' };
  if (points === 3) return { score: 0.6, label: 'medium' };
  return { score: 1, label: 'strong' };
}

const email = z
  .string()
  .trim()
  .min(1, { error: 'Email is required' })
  .pipe(z.email({ error: 'Enter a valid email address' }));

const password = z
  .string()
  .min(PASSWORD_MIN, { error: `Use at least ${PASSWORD_MIN} characters` })
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
    error: 'Include at least one letter and one number',
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: 'Password is required' }),
  remember: z.boolean(),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, { error: 'Name must be at least 2 characters' }),
    email,
    phone: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\+?[0-9 ()-]{6,20}$/.test(v), {
        error: 'Enter a valid phone number',
      }),
    password,
    confirm: z.string(),
    terms: z.boolean().refine((v) => v, { error: 'Please accept the Terms and Privacy Policy' }),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], error: 'Passwords do not match' });
export type SignupValues = z.infer<typeof signupSchema>;

export const forgotEmailSchema = z.object({ email });
export type ForgotEmailValues = z.infer<typeof forgotEmailSchema>;

export const resetPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], error: 'Passwords do not match' });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, { error: 'Enter your current password' }),
    next: password,
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ['confirm'], error: 'Passwords do not match' })
  .refine((v) => v.next !== v.current, {
    path: ['next'],
    error: 'New password must be different',
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(2, { error: 'Name must be at least 2 characters' }),
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\+?[0-9 ()-]{6,20}$/.test(v), {
      error: 'Enter a valid phone number',
    }),
});
export type ProfileValues = z.infer<typeof profileSchema>;
