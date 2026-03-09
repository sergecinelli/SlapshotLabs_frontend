import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { ModalService } from '../../../services/modal.service';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonSmallComponent } from '../buttons/button-small/button-small.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { Analysis, AnalysisType } from '../../interfaces/analysis.interface';

const PROFILE_ROUTE_SEGMENTS: Partial<Record<AnalysisType, string>> = {
  team: 'teams',
  player: 'players',
  goalie: 'goalies',
};

@Component({
  selector: 'app-analysis-view-modal',
  imports: [SectionHeaderComponent, ButtonComponent, ButtonSmallComponent, FormFieldComponent],
  templateUrl: './analysis-view.modal.html',
  styleUrl: './analysis-view.modal.scss',
})
export class AnalysisViewModal {
  private modalService = inject(ModalService);
  private router = inject(Router);
  protected data = this.modalService.getModalData<Analysis>();

  protected profileRoute = computed(() => {
    const segment = PROFILE_ROUTE_SEGMENTS[this.data.type];
    if (!segment) return null;
    return `/teams-and-rosters/${segment}/${this.data.entityId}/profile`;
  });

  protected goToProfile(): void {
    const route = this.profileRoute();
    if (!route) return;
    this.modalService.closeAll();
    this.router.navigate([route]);
  }

  protected onClose(): void {
    this.modalService.closeModal();
  }
}
