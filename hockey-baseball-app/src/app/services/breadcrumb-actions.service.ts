import { Injectable, signal, TemplateRef } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BreadcrumbActionsService {
  readonly actionsTemplate = signal<TemplateRef<unknown> | null>(null);
  readonly centerTemplate = signal<TemplateRef<unknown> | null>(null);

  setActions(template: TemplateRef<unknown>): void {
    this.actionsTemplate.set(template);
  }

  clearActions(): void {
    this.actionsTemplate.set(null);
  }

  setCenter(template: TemplateRef<unknown>): void {
    this.centerTemplate.set(template);
  }

  clearCenter(): void {
    this.centerTemplate.set(null);
  }
}
