import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Team } from '../../interfaces/team.interface';
import { TeamOptionsService } from '../../../services/team-options.service';
import { forkJoin } from 'rxjs';

export interface TeamFormModalData {
  team?: Team;
  isEditMode: boolean;
}

@Component({
  selector: 'app-team-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './team-form-modal.html',
  styleUrl: './team-form-modal.scss'
})
export class TeamFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<TeamFormModalComponent>>(MatDialogRef);
  private teamOptionsService = inject(TeamOptionsService);
  data = inject<TeamFormModalData>(MAT_DIALOG_DATA);

  teamForm: FormGroup;
  isEditMode: boolean;
  isLoading = true;

  groupOptions: { value: string; label: string }[] = [];
  levelOptions: { value: string; label: string }[] = [];
  divisionOptions: { value: string; label: string }[] = [];

  // Image picker properties
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  imageError: string | null = null;
  isDragging = false;
  isImageLoading = false;
  logoRemoved = false; // Track if user explicitly removed the logo
  readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  constructor() {
    const data = this.data;

    this.isEditMode = data.isEditMode;
    this.teamForm = this.createForm();
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
      logo: ['']
    });
  }

  /**
   * Load dropdown options from API and local data
   */
  private loadOptions(): void {
    this.isLoading = true;
    
    // Get group options (static)
    this.groupOptions = this.teamOptionsService.getGroupOptions();
    
    // Fetch levels and divisions from API
    forkJoin({
      levels: this.teamOptionsService.getTeamLevels(),
      divisions: this.teamOptionsService.getDivisions()
    }).subscribe({
      next: ({ levels, divisions }) => {
        this.levelOptions = this.teamOptionsService.transformLevelsToOptions(levels);
        this.divisionOptions = this.teamOptionsService.transformDivisionsToOptions(divisions);
        
        // Set default values after options are loaded
        this.setDefaultValues();
        
        // If in edit mode, populate the form
        if (this.isEditMode && this.data.team) {
          this.populateForm(this.data.team);
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load options:', error);
        // Use fallback options if API fails
        this.useFallbackOptions();
        this.setDefaultValues();
        
        if (this.isEditMode && this.data.team) {
          this.populateForm(this.data.team);
        }
        
        this.isLoading = false;
      }
    });
  }

  /**
   * Set default values for form controls
   */
  private setDefaultValues(): void {
    // Only set defaults if no values are already present (for new forms)
    if (!this.isEditMode) {
      this.teamForm.patchValue({
        group: this.groupOptions[0]?.value || '1U',
        level: this.levelOptions[0]?.value || 'NHL',
        division: this.divisionOptions[0]?.value || 'Atlantic'
      });
    }
    
    // Update validity after setting values
    this.teamForm.updateValueAndValidity();
  }

  /**
   * Use fallback options when API fails
   */
  private useFallbackOptions(): void {
    this.levelOptions = [
      { value: 'NHL', label: 'NHL' },
      { value: 'AHL', label: 'AHL' },
      { value: 'Junior A', label: 'Junior A' },
      { value: 'Junior B', label: 'Junior B' },
      { value: 'Junior C', label: 'Junior C' }
    ];
    
    this.divisionOptions = [
      { value: 'Atlantic', label: 'Atlantic' },
      { value: 'Metropolitan', label: 'Metropolitan' },
      { value: 'Central', label: 'Central' },
      { value: 'Pacific', label: 'Pacific' }
    ];
  }

  private populateForm(team: Team): void {
    console.log('Populating form with team:', team);
    console.log('Level options:', this.levelOptions);
    console.log('Division options:', this.divisionOptions);
    console.log('Team levelId:', team.levelId, 'divisionId:', team.divisionId);
    
    this.teamForm.patchValue({
      name: team.name,
      group: team.group,
      level: team.levelId?.toString() || this.levelOptions[0]?.value || '',
      division: team.divisionId?.toString() || this.divisionOptions[0]?.value || '',
      city: team.city,
      logo: team.logo
    });
    
    console.log('Form values after patch:', this.teamForm.value);
    
    // Set existing logo as preview if available
    if (team.logo && team.logo !== '/assets/icons/teams.svg' && !team.logo.includes('/assets/')) {
      this.isImageLoading = true;
      this.imagePreview = team.logo;
    }
  }

  /**
   * Handle image load success
   */
  onImageLoad(): void {
    this.isImageLoading = false;
  }

  /**
   * Handle image load error - fallback to upload placeholder
   */
  onImageError(): void {
    console.warn('Failed to load team logo, using default upload view');
    this.isImageLoading = false;
    this.imagePreview = null;
    this.teamForm.patchValue({ logo: '' });
  }

  /**
   * Handle file selection from input
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.validateAndProcessFile(file);
  }

  /**
   * Validate file and convert to base64
   */
  private validateAndProcessFile(file: File): void {
    this.imageError = null;
    this.logoRemoved = false; // Reset removed flag when new file is selected

    // Validate file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      this.imageError = 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.';
      this.selectedFile = null;
      this.imagePreview = null;
      return;
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      this.imageError = `File size exceeds ${this.MAX_FILE_SIZE / (1024 * 1024)}MB limit.`;
      this.selectedFile = null;
      this.imagePreview = null;
      return;
    }

    // Store the file and create preview
    this.selectedFile = file;
    this.convertFileToBase64(file);
  }

  /**
   * Convert file to base64 for preview and storage
   */
  private convertFileToBase64(file: File): void {
    this.isImageLoading = true;
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
      // Update form control with base64 data
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

  /**
   * Remove selected image
   */
  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.imageError = null;
    this.isImageLoading = false;
    this.logoRemoved = true; // Mark that logo was explicitly removed
    this.teamForm.patchValue({ logo: '' });
    
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  /**
   * Trigger file input click
   */
  triggerFileInput(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  /**
   * Handle drop event
   */
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
      return; // Prevent submission while loading
    }
    
    if (this.teamForm.valid) {
      const formValue = this.teamForm.value;
      
      // Find the selected level and division names for display
      const selectedLevel = this.levelOptions.find(opt => opt.value === formValue.level);
      const selectedDivision = this.divisionOptions.find(opt => opt.value === formValue.division);
      
      const teamData: Partial<Team> & { logoFile?: File; logoRemoved?: boolean } = {
        name: formValue.name,
        group: formValue.group,
        level: selectedLevel?.label || '',
        levelId: parseInt(formValue.level, 10),
        division: selectedDivision?.label || '',
        divisionId: parseInt(formValue.division, 10),
        city: formValue.city,
        logo: formValue.logo || '/assets/icons/teams.svg'
      };

      if (this.isEditMode && this.data.team) {
        teamData.id = this.data.team.id;
      }

      // Include the file if one was selected
      if (this.selectedFile) {
        teamData.logoFile = this.selectedFile;
      } else if (this.logoRemoved) {
        // If logo was removed, create an empty blob to signal deletion
        const emptyBlob = new Blob([], { type: 'application/octet-stream' });
        teamData.logoFile = new File([emptyBlob], 'empty.dat');
        teamData.logoRemoved = true;
      }

      this.dialogRef.close(teamData);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.teamForm.controls).forEach(key => {
        this.teamForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Get form validity status for debugging
   */
  get isFormValid(): boolean {
    return this.teamForm.valid;
  }

  /**
   * Get form errors for debugging
   */
  get formErrors(): Record<string, unknown> {
    const errors: Record<string, unknown> = {};
    Object.keys(this.teamForm.controls).forEach(key => {
      const control = this.teamForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  getErrorMessage(fieldName: string): string {
    const control = this.teamForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (control.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${control.errors['minlength'].requiredLength} characters long`;
      }
      if (control.errors['min']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${control.errors['min'].min}`;
      }
      if (control.errors['max']) {
        return `${this.getFieldLabel(fieldName)} must be no more than ${control.errors['max'].max}`;
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      name: 'Team Name',
      group: 'Group',
      level: 'Level',
      division: 'Division',
      city: 'City',
      logo: 'Team Logo'
    };
    return labels[fieldName] || fieldName;
  }
}
