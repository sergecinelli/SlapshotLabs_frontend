import { AbstractControl, ValidationErrors } from '@angular/forms';

const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+(\?[^\s]*)?$/;

export function youtubeUrlValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) {
    return null;
  }
  return YOUTUBE_URL_REGEX.test(control.value) ? null : { invalidYoutubeUrl: true };
}
