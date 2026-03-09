import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalEvent, ModalService } from '../../../services/modal.service';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { Goalie } from '../../interfaces/goalie.interface';
import { Analysis, AnalyticsApiIn } from '../../interfaces/analysis.interface';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { CustomSelectComponent, SelectOptionGroup } from '../custom-select/custom-select.component';
import { getFieldError } from '../../validators/form-error.util';

export interface GoalieAnalysisModalData {
  analysis?: Analysis;
  isEditMode: boolean;
  preSelectedGoalieId?: string;
  goalies: Goalie[];
}

@Component({
  selector: 'app-goalie-analysis-modal',
  imports: [
    ReactiveFormsModule,
    SectionHeaderComponent,
    FormFieldComponent,
    ButtonComponent,
    ButtonLoadingComponent,
    CustomSelectComponent,
  ],
  templateUrl: './goalie-analysis.modal.html',
  styleUrl: './goalie-analysis.modal.scss',
})
export class GoalieAnalysisModal {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  data = inject(ModalService).getModalData<GoalieAnalysisModalData>();

  analysisForm: FormGroup;
  isEditMode: boolean;
  isSubmitting = signal(false);

  allGoalies = signal<Goalie[]>([]);
  selectedEntityId = signal('');

  goalieOptionGroups = computed<SelectOptionGroup[]>(() => {
    const goalies = this.allGoalies();
    const groups = new Map<string, Goalie[]>();
    for (const goalie of goalies) {
      const key = goalie.team || 'Unknown Team';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(goalie);
    }
    return Array.from(groups, ([teamName, entries]) => ({
      label: teamName,
      options: entries.map((g) => ({
        value: g.id,
        label: `${g.firstName} ${g.lastName}`,
        prefix: `#${g.jerseyNumber}`,
      })),
    }));
  });

  isEntityLocked = computed(() => !!this.data.preSelectedGoalieId || this.isEditMode);

  selectedGoalieLabel = computed(() => {
    const entityId = this.selectedEntityId();
    if (!entityId) return '';
    const goalie = this.allGoalies().find((g) => g.id === entityId);
    return goalie ? `${goalie.firstName} ${goalie.lastName}` : '';
  });

  constructor() {
    this.isEditMode = this.data.isEditMode;
    this.allGoalies.set(this.data.goalies);

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
      player_id: parseInt(formValue.entityId, 10),
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
    entityId: 'Goalie',
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
    } else if (this.data.preSelectedGoalieId) {
      this.analysisForm.patchValue({ entityId: this.data.preSelectedGoalieId });
    }
  }
}
