import { Directive, inject, OnDestroy, TemplateRef } from '@angular/core';
import { BreadcrumbActionsService } from '../../services/breadcrumb-actions.service';

@Directive({
  selector: '[appBreadcrumbCenter]',
})
export class BreadcrumbCenterDirective implements OnDestroy {
  private breadcrumbActions = inject(BreadcrumbActionsService);
  private templateRef = inject(TemplateRef);

  constructor() {
    this.breadcrumbActions.setCenter(this.templateRef);
  }

  ngOnDestroy(): void {
    this.breadcrumbActions.clearCenter();
  }
}
