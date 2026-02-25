import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BreadcrumbDataService {
  readonly entityName = signal('');

  reset(): void {
    this.entityName.set('');
  }
}
