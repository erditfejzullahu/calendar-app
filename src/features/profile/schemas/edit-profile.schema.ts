import {z} from 'zod';

const EMAIL_REFINE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates profile edits — requires current password when email changes or new password filled.
 */
export const createEditProfileSchema = (initialEmailLower: string) => {
  return z
    .object({
      displayName: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Too long'),
      email: z
        .string()
        .trim()
        .min(1, 'Email is required')
        .regex(EMAIL_REFINE, 'Enter a valid email'),
      currentPassword: z.string().optional(),
      newPassword: z.string().optional().or(z.literal('')),
      confirmPassword: z.string().optional().or(z.literal('')),
    })
    .superRefine((val, ctx) => {
      const newEmailLc = val.email.trim().toLowerCase();
      const emailChanged = newEmailLc !== initialEmailLower;
      const newPw = val.newPassword?.trim() ?? '';
      const confirming = val.confirmPassword?.trim() ?? '';
      const sensitive = emailChanged || newPw.length > 0;

      if (sensitive) {
        const cur = val.currentPassword?.trim() ?? '';
        if (!cur.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['currentPassword'],
            message: 'Enter your current password to change email or password',
          });
        }
      }

      if (newPw.length > 0) {
        if (newPw.length < 8) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['newPassword'],
            message: 'Password must be at least 8 characters',
          });
        }
        if (newPw !== confirming) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['confirmPassword'],
            message: 'Does not match new password',
          });
        }
      }
    });
};

export type EditProfileFormValues = {
  displayName: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};
