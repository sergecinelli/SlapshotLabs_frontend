import { Directive, inject, OnDestroy, TemplateRef } from '@angular/core';
import { BreadcrumbActionsService } from '../../services/breadcrumb-actions.service';

@Directive({
  selector: '[appBreadcrumbActions]',
})
export class BreadcrumbActionsDirective implements OnDestroy {
  private breadcrumbActions = inject(BreadcrumbActionsService);
  private templateRef = inject(TemplateRef);

  constructor() {
    this.breadcrumbActions.setActions(this.templateRef);
  }

  ngOnDestroy(): void {
    this.breadcrumbActions.clearActions();
  }
}
