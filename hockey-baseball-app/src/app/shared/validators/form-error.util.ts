import { AbstractControl } from '@angular/forms';

export const GAME_TIME_PATTERN_ERROR: Record<string, string> = {
  pattern: 'Time must be in mm:ss format (max 200:00)',
};

export function getFieldError(
  control: AbstractControl | null | undefined,
  label: string,
  customMessages?: Record<string, string>
): string {
  if (!control?.errors || !control.touched) return '';

  if (control.errors['required']) {
    return `${label} is required`;
  }

  if (customMessages) {
    for (const [key, msg] of Object.entries(customMessages)) {
      if (control.errors[key]) return msg;
    }
  }

  if (control.errors['invalidEmail']) {
    return 'Please enter a valid email address';
  }

  if (control.errors['invalidYoutubeUrl']) {
    return 'Please enter a valid YouTube link';
  }

  if (control.errors['minlength']) {
    return `${label} must be at least ${control.errors['minlength'].requiredLength} characters long`;
  }

  if (control.errors['maxlength']) {
    return `Cannot exceed ${control.errors['maxlength'].requiredLength} characters`;
  }

  if (control.errors['min']) {
    return `${label} must be at least ${control.errors['min'].min}`;
  }

  if (control.errors['max']) {
    return `${label} must be no more than ${control.errors['max'].max}`;
  }

  return '';
}
