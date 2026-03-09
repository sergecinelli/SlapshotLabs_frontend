import { AbstractControl, ValidationErrors } from '@angular/forms';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) {
    return null;
  }
  return EMAIL_REGEX.test(control.value) ? null : { invalidEmail: true };
}
