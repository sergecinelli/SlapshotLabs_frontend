import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutBackgroundService {
  readonly dotsBg = signal(false);

  showDots(): void {
    this.dotsBg.set(true);
  }

  hideDots(): void {
    this.dotsBg.set(false);
  }
}
