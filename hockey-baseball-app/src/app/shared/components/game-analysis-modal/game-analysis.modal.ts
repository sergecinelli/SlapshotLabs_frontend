import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalEvent, ModalService } from '../../../services/modal.service';
import { Analysis, AnalyticsApiIn } from '../../interfaces/analysis.interface';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { CustomSelectComponent, SelectOption } from '../custom-select/custom-select.component';
import { getFieldError } from '../../validators/form-error.util';

export interface GameOption {
  value: string;
  label: string;
}

export interface GameAnalysisModalData {
  analysis?: Analysis;
  isEditMode: boolean;
  preSelectedGameId?: string;
  games: GameOption[];
}

@Component({
  selector: 'app-game-analysis-modal',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    ButtonLoadingComponent,
    SectionHeaderComponent,
    FormFieldComponent,
    CustomSelectComponent,
  ],
  templateUrl: './game-analysis.modal.html',
  styleUrl: './game-analysis.modal.scss',
})
export class GameAnalysisModal {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  data = inject(ModalService).getModalData<GameAnalysisModalData>();

  analysisForm: FormGroup;
  isEditMode: boolean;
  isSubmitting = signal(false);

  allGames = signal<GameOption[]>([]);
  selectedEntityId = signal('');

  gameOptions = computed<SelectOption[]>(() =>
    this.allGames().map((g) => ({ value: g.value, label: g.label }))
  );

  isEntityLocked = computed(() => !!this.data.preSelectedGameId || this.isEditMode);

  selectedGameLabel = computed(() => {
    const entityId = this.selectedEntityId();
    if (!entityId) return '';
    const game = this.allGames().find((g) => g.value === entityId);
    return game ? game.label : '';
  });

  constructor() {
    this.isEditMode = this.data.isEditMode;
    this.allGames.set(this.data.games);

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
      game_id: parseInt(formValue.entityId, 10),
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
    entityId: 'Game',
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
    } else if (this.data.preSelectedGameId) {
      this.analysisForm.patchValue({ entityId: this.data.preSelectedGameId });
    }
  }
}
