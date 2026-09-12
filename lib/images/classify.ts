import type { ErrorCategory } from '@/lib/images/schemas';
import { ImageValidationError } from '@/lib/images/process';

/**
 * Classifies an unexpected error into the persisted error taxonomy.
 * Trigger.dev/SDK/network/binary errors are transient by default; anything
 * already tagged ImageValidationError keeps its category.
 */
export function classifyError(error: unknown): { category: ErrorCategory; message: string } {
  if (error instanceof ImageValidationError) {
    return { category: error.category, message: error.message };
  }
  if (
    error &&
    typeof error === 'object' &&
    'category' in error &&
    typeof (error as { category: unknown }).category === 'string'
  ) {
    const { category, message } = error as { category: ErrorCategory; message?: string };
    return { category, message: message ?? 'Image processing failed.' };
  }
  return { category: 'UNKNOWN', message: 'Something went wrong while processing the image.' };
}
