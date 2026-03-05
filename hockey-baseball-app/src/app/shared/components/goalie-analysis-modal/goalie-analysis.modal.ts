import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalEvent, ModalService } from '../../../services/modal.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { Goalie } from '../../interfaces/goalie.interface';
import { Analysis, AnalyticsApiIn } from '../../interfaces/analysis.interface';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';

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
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    ButtonComponent,
    ButtonLoadingComponent,
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
  searchText = signal('');
  selectedEntityId = signal('');

  groupedGoalies = computed(() => {
    const goalies = this.allGoalies();
    const search = this.searchText().toLowerCase();
    const groups = new Map<string, Goalie[]>();
    for (const goalie of goalies) {
      if (search && !this.goalieMatchesSearch(goalie, search)) continue;
      const key = goalie.team || 'Unknown Team';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(goalie);
    }
    return Array.from(groups, ([teamName, entries]) => ({ teamName, entries }));
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

    this.modalService.onEvent$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event === ModalEvent.StopButtonLoading) {
        this.isSubmitting.set(false);
      }
    });

    this.patchFormValues();
  }

  onSelectOpenedChange(opened: boolean): void {
    if (!opened) {
      this.searchText.set('');
    }
  }

  onSearchInput(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  clearSearch(input: HTMLInputElement): void {
    this.searchText.set('');
    input.value = '';
    input.focus();
  }

  isGoalieVisible(goalie: Goalie): boolean {
    return this.goalieMatchesSearch(goalie, this.searchText().toLowerCase());
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

  getErrorMessage(fieldName: string): string {
    const control = this.analysisForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        const labels: Record<string, string> = {
          entityId: 'Goalie',
          title: 'Title',
          author: 'Author',
          analysis: 'Analysis',
        };
        return `${labels[fieldName] || fieldName} is required`;
      }
    }
    return '';
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

  private goalieMatchesSearch(goalie: Goalie, search: string): boolean {
    if (!search) return true;
    return (
      goalie.firstName.toLowerCase().includes(search) ||
      goalie.lastName.toLowerCase().includes(search) ||
      String(goalie.jerseyNumber).includes(search)
    );
  }
}
