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
    this.teamForm.patchValue({
      name: team.name,
      group: team.group,
      level: team.level,
      division: team.division,
      city: team.city,
      logo: team.logo
    });
  }

  onSubmit(): void {
    if (this.isLoading) {
      return; // Prevent submission while loading
    }
    
    if (this.teamForm.valid) {
      const formValue = this.teamForm.value;
      
      const teamData: Partial<Team> = {
        name: formValue.name,
        group: formValue.group,
        level: formValue.level,
        division: formValue.division,
        city: formValue.city,
        logo: formValue.logo || '/assets/icons/teams.svg'
      };

      if (this.isEditMode && this.data.team) {
        teamData.id = this.data.team.id;
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
