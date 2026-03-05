import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalEvent, ModalService } from '../../../services/modal.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDividerModule } from '@angular/material/divider';
import { AsyncPipe } from '@angular/common';
import { Observable, of } from 'rxjs';
import { startWith, map } from 'rxjs/operators';
import { TeamService } from '../../../services/team.service';
import { Analysis } from '../../interfaces/analysis.interface';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';

export interface TeamAnalysisModalData {
  analysis?: Analysis;
  isEditMode: boolean;
  preSelectedTeamId?: string;
  entityOptions?: { value: string; label: string }[];
}

interface EntityOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-team-analysis-modal',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatDividerModule,
    AsyncPipe,
    ButtonComponent,
    ButtonLoadingComponent,
  ],
  templateUrl: './team-analysis.modal.html',
  styleUrl: './team-analysis.modal.scss',
})
export class TeamAnalysisModal implements OnInit {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private teamService = inject(TeamService);
  data = inject(ModalService).getModalData<TeamAnalysisModalData>();

  analysisForm: FormGroup;
  isEditMode: boolean;
  isLoading = true;
  isSubmitting = signal(false);
  entityOptions: EntityOption[] = [];
  filteredEntityOptions: Observable<EntityOption[]> = of([]);

  constructor() {
    this.isEditMode = this.data.isEditMode;
    this.analysisForm = this.fb.group({
      entityId: ['', [Validators.required]],
      analysisBy: ['', [Validators.required]],
      analysisText: ['', [Validators.required]],
    });

    this.modalService.onEvent$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event === ModalEvent.StopButtonLoading) {
        this.isSubmitting.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.loadEntityOptions();
  }

  private loadEntityOptions(): void {
    this.isLoading = true;

    if (this.data.entityOptions) {
      this.entityOptions = this.data.entityOptions;
      this.isLoading = false;
      this.setupEntityFilter();
      this.patchFormValues();
      return;
    }

    this.teamService.getTeams().subscribe({
      next: (result) => {
        this.entityOptions = result.teams.map((t) => ({
          value: t.id,
          label: t.name,
        }));

        this.isLoading = false;
        this.setupEntityFilter();
        this.patchFormValues();
      },
      error: (error) => {
        console.error('Failed to load teams:', error);
        this.isLoading = false;
      },
    });
  }

  private patchFormValues(): void {
    if (this.isEditMode && this.data.analysis) {
      this.analysisForm.patchValue({
        entityId: String(this.data.analysis.entityId),
        analysisBy: this.data.analysis.analysisBy,
        analysisText: this.data.analysis.analysisText,
      });
    } else if (this.data.preSelectedTeamId) {
      this.analysisForm.patchValue({ entityId: this.data.preSelectedTeamId });
    }
  }

  protected displayEntityFn = (value: string): string => {
    if (!value) return '';
    const option = this.entityOptions.find((opt) => opt.value === value);
    return option ? option.label : value;
  };

  private setupEntityFilter(): void {
    this.filteredEntityOptions = this.analysisForm.get('entityId')!.valueChanges.pipe(
      startWith(''),
      map((value: string) => {
        if (!value || typeof value !== 'string') {
          return this.entityOptions;
        }
        const filterValue = value.toLowerCase();
        return this.entityOptions.filter(
          (option) =>
            option.label.toLowerCase().includes(filterValue) ||
            option.value.toLowerCase().includes(filterValue)
        );
      })
    );
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
    const apiData = {
      type: 'team' as const,
      entity_id: parseInt(formValue.entityId, 10),
      analysis_by: formValue.analysisBy,
      analysis_text: formValue.analysisText,
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
          entityId: 'Team',
          analysisBy: 'Analysis By',
          analysisText: 'Analysis',
        };
        return `${labels[fieldName] || fieldName} is required`;
      }
    }
    return '';
  }
}
