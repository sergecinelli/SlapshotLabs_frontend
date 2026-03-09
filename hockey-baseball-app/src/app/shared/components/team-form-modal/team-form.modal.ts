import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ModalService, ModalEvent } from '../../../services/modal.service';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { Team } from '../../interfaces/team.interface';
import { TeamLevel, Division } from '../../interfaces/team-level.interface';
import { TeamOptionsService } from '../../../services/team-options.service';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { CustomSelectComponent, SelectOption } from '../custom-select/custom-select.component';
import { CustomAutocompleteComponent } from '../custom-autocomplete/custom-autocomplete.component';
import { forkJoin } from 'rxjs';
import { getFieldError } from '../../validators/form-error.util';

export interface TeamFormModalData {
  team?: Team;
  isEditMode: boolean;
  ageGroups?: string[];
  levels?: TeamLevel[];
  divisions?: Division[];
}

@Component({
  selector: 'app-team-form-modal',
  imports: [
    ReactiveFormsModule,
    SectionHeaderComponent,
    LoadingSpinnerComponent,
    ButtonComponent,
    ButtonLoadingComponent,
    FormFieldComponent,
    CustomSelectComponent,
    CustomAutocompleteComponent,
  ],
  templateUrl: './team-form.modal.html',
  styleUrl: './team-form.modal.scss',
})
export class TeamFormModal implements OnInit {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private teamOptionsService = inject(TeamOptionsService);
  data = inject(ModalService).getModalData<TeamFormModalData>();

  teamForm: FormGroup;
  isEditMode: boolean;
  isLoading = true;

  groupOptions: SelectOption[] = [];
  levelOptions: SelectOption[] = [];
  divisionOptions: SelectOption[] = [];

  isSubmitting = signal(false);

  selectedFile: File | null = null;
  imagePreview: string | null = null;
  imageError: string | null = null;
  isDragging = false;
  isImageLoading = false;
  logoRemoved = false;
  readonly MAX_FILE_SIZE = 5 * 1024 * 1024;
  readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  constructor() {
    const data = this.data;

    this.isEditMode = data.isEditMode;
    this.teamForm = this.createForm();

    this.modalService.registerDirtyCheck(() => this.teamForm.dirty);
    this.modalService.onEvent$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event === ModalEvent.StopButtonLoading) {
        this.isSubmitting.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.loadOptions();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      group: ['', [Validators.required]],
      level: ['', [Validators.required]],
      division: ['', [Validators.required]],
      city: [''],
      abbreviation: [''],
      logo: [''],
    });
  }

  private loadOptions(): void {
    this.isLoading = true;

    if (this.data.ageGroups && this.data.levels && this.data.divisions) {
      this.applyOptions(this.data.ageGroups, this.data.levels, this.data.divisions);
      return;
    }

    forkJoin({
      ageGroups: this.teamOptionsService.getTeamAgeGroups(),
      levels: this.teamOptionsService.getTeamLevels(),
      divisions: this.teamOptionsService.getDivisions(),
    }).subscribe({
      next: ({ ageGroups, levels, divisions }) => {
        this.applyOptions(ageGroups, levels, divisions);
      },
      error: (error) => {
        console.error('Failed to load options:', error);
        this.groupOptions = this.teamOptionsService.getGroupOptions();
        this.setDefaultValues();

        if (this.isEditMode && this.data.team) {
          this.populateForm(this.data.team);
        }

        this.isLoading = false;
      },
    });
  }

  private applyOptions(ageGroups: string[], levels: TeamLevel[], divisions: Division[]): void {
    this.groupOptions = this.teamOptionsService.transformAgeGroupsToOptions(ageGroups);
    this.levelOptions = this.teamOptionsService.transformLevelsToOptions(levels);
    this.divisionOptions = this.teamOptionsService.transformDivisionsToOptions(divisions);
    this.setDefaultValues();

    if (this.isEditMode && this.data.team) {
      this.populateForm(this.data.team);
    }

    this.isLoading = false;
  }

  private setDefaultValues(): void {
    if (!this.isEditMode) {
      this.teamForm.patchValue({
        group: this.groupOptions[0]?.value || '1U',
        level: this.levelOptions[0]?.value || 'NHL',
        division: this.divisionOptions[0]?.value || 'Atlantic',
      });
    }

    this.teamForm.updateValueAndValidity();
  }

  private populateForm(team: Team): void {
    this.teamForm.patchValue({
      name: team.name,
      group: team.group,
      level: team.levelId?.toString() || this.levelOptions[0]?.value || '',
      division: team.divisionId?.toString() || this.divisionOptions[0]?.value || '',
      city: team.city,
      abbreviation: team.abbreviation || '',
      logo: team.logo,
    });

    if (team.logo && team.logo !== '/assets/icons/teams.svg' && !team.logo.includes('/assets/')) {
      this.isImageLoading = true;
      this.imagePreview = team.logo;
    }
  }

  onImageLoad(): void {
    this.isImageLoading = false;
  }

  onImageError(): void {
    console.warn('Failed to load team logo, using default upload view');
    this.isImageLoading = false;
    this.imagePreview = null;
    this.teamForm.patchValue({ logo: '' });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.validateAndProcessFile(file);
  }

  private validateAndProcessFile(file: File): void {
    this.imageError = null;
    this.logoRemoved = false;

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      this.imageError = 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.';
      this.selectedFile = null;
      this.imagePreview = null;
      return;
    }

    if (file.size > this.MAX_FILE_SIZE) {
      this.imageError = `File size exceeds ${this.MAX_FILE_SIZE / (1024 * 1024)}MB limit.`;
      this.selectedFile = null;
      this.imagePreview = null;
      return;
    }

    this.selectedFile = file;
    this.convertFileToBase64(file);
  }

  private convertFileToBase64(file: File): void {
    this.isImageLoading = true;
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
      this.teamForm.patchValue({ logo: reader.result as string });
      this.isImageLoading = false;
    };
    reader.onerror = () => {
      this.imageError = 'Failed to read file. Please try again.';
      this.selectedFile = null;
      this.imagePreview = null;
      this.isImageLoading = false;
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.imageError = null;
    this.isImageLoading = false;
    this.logoRemoved = true;
    this.teamForm.patchValue({ logo: '' });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  triggerFileInput(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      this.validateAndProcessFile(file);
    }
  }

  onSubmit(): void {
    if (this.isLoading) {
      return;
    }

    if (this.teamForm.valid) {
      const formValue = this.teamForm.value;

      const selectedLevel = this.levelOptions.find((opt) => opt.value === formValue.level);
      const selectedDivision = this.divisionOptions.find((opt) => opt.value === formValue.division);

      const teamData: Partial<Team> & { logoFile?: File; logoRemoved?: boolean } = {
        name: formValue.name,
        group: formValue.group,
        level: selectedLevel?.label || '',
        levelId: parseInt(formValue.level, 10),
        division: selectedDivision?.label || '',
        divisionId: parseInt(formValue.division, 10),
        city: formValue.city,
        abbreviation: formValue.abbreviation || undefined,
        logo: formValue.logo || '/assets/icons/teams.svg',
      };

      if (this.isEditMode && this.data.team) {
        teamData.id = this.data.team.id;
      }

      if (this.selectedFile) {
        teamData.logoFile = this.selectedFile;
      } else if (this.logoRemoved) {
        const emptyBlob = new Blob([], { type: 'application/octet-stream' });
        teamData.logoFile = new File([emptyBlob], 'empty.dat');
        teamData.logoRemoved = true;
      }

      this.isSubmitting.set(true);
      this.modalService.closeWithDataProcessing(teamData);
    } else {
      Object.keys(this.teamForm.controls).forEach((key) => {
        this.teamForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.modalService.closeModal();
  }

  get isFormValid(): boolean {
    return this.teamForm.valid;
  }

  get formErrors(): Record<string, unknown> {
    const errors: Record<string, unknown> = {};
    Object.keys(this.teamForm.controls).forEach((key) => {
      const control = this.teamForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  private readonly fieldLabels: Record<string, string> = {
    name: 'Team Name',
    group: 'Group',
    level: 'Level',
    division: 'Division',
    city: 'City',
    abbreviation: 'Abbreviation',
    logo: 'Team Logo',
  };

  getErrorMessage(fieldName: string): string {
    const control = this.teamForm.get(fieldName);
    const label = this.fieldLabels[fieldName] || fieldName;
    return getFieldError(control, label);
  }
}
