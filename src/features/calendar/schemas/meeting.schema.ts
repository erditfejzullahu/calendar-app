import {z} from 'zod';
import type {Meeting} from '@app-types/meeting';
import {hhmmToMinutes, isValidHHmm} from '@shared/utils/time';
import {findOverlappingMeeting} from '../utils/overlap';

const timeField = z
  .string()
  .trim()
  .refine(isValidHHmm, {message: 'Use HH:mm format (e.g. 09:30)'});

const baseShape = {
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(80, 'Title must be 80 characters or fewer'),
  description: z
    .string()
    .trim()
    .max(500, 'Description is too long')
    .optional()
    .or(z.literal('')),
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  startTime: timeField,
  endTime: timeField,
};

/**
 * Builds a meeting schema scoped to a specific day, capturing the existing
 * meetings of that day in the closure so we can validate non-overlap at the
 * Zod layer (form errors localize automatically).
 */
export const buildMeetingSchema = (
  existingMeetingsForDay: Meeting[],
  ignoreId?: string,
) =>
  z
    .object(baseShape)
    .superRefine((val, ctx) => {
      const start = hhmmToMinutes(val.startTime);
      const end = hhmmToMinutes(val.endTime);

      if (end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endTime'],
          message: 'End time must be after start time',
        });
        return;
      }

      const clash = findOverlappingMeeting(
        existingMeetingsForDay,
        val.startTime,
        val.endTime,
        ignoreId,
      );
      if (clash) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['startTime'],
          message: `Overlaps "${clash.title}" (${clash.startTime}–${clash.endTime})`,
        });
      }
    });

export type MeetingFormValues = z.infer<ReturnType<typeof buildMeetingSchema>>;
