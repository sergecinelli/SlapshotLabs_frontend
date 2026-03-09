import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalEvent, ModalService } from '../../../services/modal.service';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { Team } from '../../interfaces/team.interface';
import { Analysis, AnalyticsApiIn } from '../../interfaces/analysis.interface';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { CustomSelectComponent, SelectOption } from '../custom-select/custom-select.component';
import { getFieldError } from '../../validators/form-error.util';

export interface TeamAnalysisModalData {
  analysis?: Analysis;
  isEditMode: boolean;
  preSelectedTeamId?: string;
  teams: Team[];
}

@Component({
  selector: 'app-team-analysis-modal',
  imports: [
    ReactiveFormsModule,
    SectionHeaderComponent,
    ButtonComponent,
    ButtonLoadingComponent,
    FormFieldComponent,
    CustomSelectComponent,
  ],
  templateUrl: './team-analysis.modal.html',
  styleUrl: './team-analysis.modal.scss',
})
export class TeamAnalysisModal {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  data = inject(ModalService).getModalData<TeamAnalysisModalData>();

  analysisForm: FormGroup;
  isEditMode: boolean;
  isSubmitting = signal(false);

  allTeams = signal<Team[]>([]);

  teamOptions = computed<SelectOption[]>(() =>
    this.allTeams().map((t) => ({ value: String(t.id), label: t.name }))
  );

  isEntityLocked = computed(() => !!this.data.preSelectedTeamId || this.isEditMode);

  selectedTeamLabel = computed(() => {
    const entityId = this.selectedEntityId();
    if (!entityId) return '';
    const team = this.allTeams().find((t) => String(t.id) === entityId);
    return team ? team.name : '';
  });

  private selectedEntityId = signal('');

  constructor() {
    this.isEditMode = this.data.isEditMode;
    this.allTeams.set(this.data.teams);

    this.analysisForm = this.fb.group({
      entityId: ['', [Validators.required]],
      title: ['', [Validators.required]],
      author: ['', [Validators.required]],
      analysis: ['', [Validators.required]],
    });

    this.analysisForm
      .get('entityId')!
      .valueChanges.pipe(takeUntilDestroyed())
      .subscribe((value: string) => this.selectedEntityId.set(value));

    this.modalService.registerDirtyCheck(() => this.analysisForm.dirty);
    this.modalService.onEvent$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event === ModalEvent.StopButtonLoading) {
        this.isSubmitting.set(false);
      }
    });

    this.patchFormValues();
  }

  onSubmit(): void {
    if (this.analysisForm.invalid) {
      Object.keys(this.analysisForm.controls).forEach((key) => {
        this.analysisForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.analysisForm.value;
    const apiData: AnalyticsApiIn = {
      author: formValue.author,
      title: formValue.title,
      analysis: formValue.analysis,
      team_id: parseInt(formValue.entityId, 10),
    };

    this.modalService.closeWithDataProcessing({
      isEditMode: this.isEditMode,
      analysisId: this.data.analysis?.id,
      apiData,
    });
  }

  onCancel(): void {
    this.modalService.closeModal();
  }

  private readonly fieldLabels: Record<string, string> = {
    entityId: 'Team',
    title: 'Title',
    author: 'Author',
    analysis: 'Analysis',
  };

  getErrorMessage(fieldName: string): string {
    return getFieldError(
      this.analysisForm.get(fieldName),
      this.fieldLabels[fieldName] || fieldName
    );
  }

  private patchFormValues(): void {
    if (this.isEditMode && this.data.analysis) {
      this.analysisForm.patchValue({
        entityId: String(this.data.analysis.entityId),
        title: this.data.analysis.title,
        author: this.data.analysis.author,
        analysis: this.data.analysis.analysis,
      });
    } else if (this.data.preSelectedTeamId) {
      this.analysisForm.patchValue({ entityId: this.data.preSelectedTeamId });
    }
  }
}
