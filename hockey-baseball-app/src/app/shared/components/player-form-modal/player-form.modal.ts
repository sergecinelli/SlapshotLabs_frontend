import { Component, OnInit, inject , ChangeDetectionStrategy } from '@angular/core';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { forkJoin, of } from 'rxjs';
import { Player } from '../../interfaces/player.interface';
import { Team } from '../../interfaces/team.interface';
import { TeamService } from '../../../services/team.service';
import { PositionService, PositionOption } from '../../../services/position.service';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';

export interface PlayerFormModalData {
  player?: Player;
  isEditMode: boolean;
  teams?: Team[]; // Optional: pass teams to avoid redundant API calls
  teamId?: string; // Team ID to assign new players to
  teamName?: string; // Team name for display
}

export interface TeamOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-player-form-modal',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule,
    ButtonComponent,
    ButtonLoadingComponent
],
  templateUrl: './player-form.modal.html',
  styleUrl: './player-form.modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerFormModal implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<PlayerFormModal>>(MatDialogRef);
  private teamService = inject(TeamService);
  private positionService = inject(PositionService);
  data = inject<PlayerFormModalData>(MAT_DIALOG_DATA);

  playerForm: FormGroup;
  isEditMode: boolean;
  isLoading = true;

  shootsOptions = [
    { value: 'Right Shot', label: 'Right Shot' },
    { value: 'Left Shot', label: 'Left Shot' },
  ];

  positionOptions: PositionOption[] = [];
  teamOptions: TeamOption[] = [];

  constructor() {
    const data = this.data;

    this.isEditMode = data.isEditMode;
    this.playerForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadFormData();
  }

  private loadFormData(): void {
    this.isLoading = true;

    // Use provided teams or fetch from API
    const teamsObservable = this.data.teams
      ? of({ teams: this.data.teams, total: this.data.teams.length })
      : this.teamService.getTeams();

    // Fetch teams and positions concurrently
    forkJoin({
      teams: teamsObservable,
      positions: this.positionService.getPositions(),
    }).subscribe({
      next: ({ teams, positions }) => {
        // Transform teams to options format
        this.teamOptions = teams.teams.map((team) => ({
          value: team.id,
          label: team.name,
        }));

        this.positionOptions = positions;

        // Set default values to first available options
        this.setDefaultFormValues();

        this.isLoading = false;

        // Populate form if in edit mode (this will override defaults)
        if (this.isEditMode && this.data.player) {
          this.populateForm(this.data.player);
        }
      },
      error: (error) => {
        console.error('Failed to load form data:', error);

        // Set default values to first available options
        this.setDefaultFormValues();

        this.isLoading = false;

        // Populate form if in edit mode (this will override defaults)
        if (this.isEditMode && this.data.player) {
          this.populateForm(this.data.player);
        }
      },
    });
  }

  private setDefaultFormValues(): void {
    const defaultValues: Record<string, string> = {};

    // Set team from data if provided, otherwise use first team
    if (this.data.teamId) {
      defaultValues['team'] = this.data.teamId;
    } else if (this.teamOptions.length > 0) {
      defaultValues['team'] = this.teamOptions[0].value;
    }

    // Set first position as default
    if (this.positionOptions.length > 0) {
      defaultValues['position'] = this.positionOptions[0].value;
    }

    // Set first shoots option as default
    if (this.shootsOptions.length > 0) {
      defaultValues['shoots'] = this.shootsOptions[0].value;
    }

    // Apply defaults to form
    if (Object.keys(defaultValues).length > 0) {
      this.playerForm.patchValue(defaultValues);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      team: [''],
      birthYear: ['', [Validators.min(1900), Validators.max(new Date().getFullYear())]],
      jerseyNumber: ['', [Validators.min(1), Validators.max(99)]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      position: [''],
      height: [''],
      weight: ['', [Validators.min(1)]],
      shoots: [this.shootsOptions[0]?.value || ''],
      birthplace: [''],
      addressCountry: [''],
      addressRegion: [''],
      addressCity: [''],
      addressStreet: [''],
      addressPostalCode: [''],
      playerBiography: [''],
      analysis: [''],
    });
  }

  private populateForm(player: Player): void {
    // Find the team ID by matching team name
    let teamId = '';
    const matchingTeam = this.teamOptions.find((opt) => opt.label === player.team);
    if (matchingTeam) {
      teamId = matchingTeam.value;
    } else {
      // Fallback: try to extract team ID from team string like "Team 1"
      const teamIdMatch = player.team.match(/Team (\d+)/);
      if (teamIdMatch && teamIdMatch[1]) {
        teamId = teamIdMatch[1];
      }
    }

    this.playerForm.patchValue({
      team: teamId,
      birthYear: player.birthYear,
      jerseyNumber: player.jerseyNumber,
      firstName: player.firstName,
      lastName: player.lastName,
      position: player.position,
      height: player.height,
      weight: player.weight,
      shoots: player.shoots,
      birthplace: (player as Record<string, unknown>)['birthplace'],
      addressCountry: (player as Record<string, unknown>)['addressCountry'],
      addressRegion: (player as Record<string, unknown>)['addressRegion'],
      addressCity: (player as Record<string, unknown>)['addressCity'],
      addressStreet: (player as Record<string, unknown>)['addressStreet'],
      addressPostalCode: (player as Record<string, unknown>)['addressPostalCode'],
      playerBiography: (player as Record<string, unknown>)['playerBiography'],
      analysis: (player as Record<string, unknown>)['analysis'],
    });
  }

  onSubmit(): void {
    if (this.playerForm.valid) {
      const formValue = this.playerForm.value;

      // Convert team ID back to team name
      const selectedTeam = this.teamOptions.find((opt) => opt.value === formValue.team);
      const teamName = selectedTeam ? selectedTeam.label : formValue.team;
      const teamId = formValue.team; // Keep the team ID

      const playerData: Partial<Player> & Record<string, unknown> = {
        team: teamName,
        teamId: teamId,
        birthYear: formValue.birthYear,
        jerseyNumber: formValue.jerseyNumber,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        position: formValue.position,
        height: formValue.height,
        weight: formValue.weight,
        shoots: formValue.shoots,
        birthplace: formValue.birthplace,
        addressCountry: formValue.addressCountry,
        addressRegion: formValue.addressRegion,
        addressCity: formValue.addressCity,
        addressStreet: formValue.addressStreet,
        addressPostalCode: formValue.addressPostalCode,
        playerBiography: formValue.playerBiography,
        analysis: formValue.analysis,
      };

      if (this.isEditMode && this.data.player) {
        playerData.id = this.data.player.id;
      }

      this.dialogRef.close(playerData);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.playerForm.controls).forEach((key) => {
        this.playerForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.playerForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
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
      team: 'Team',
      birthYear: 'Birth Year',
      jerseyNumber: 'Number',
      firstName: 'First Name',
      lastName: 'Last Name',
      position: 'Position',
      height: 'Height',
      weight: 'Weight',
      shoots: 'Shoots',
      birthplace: 'Birthplace',
      addressCountry: 'Country',
      addressRegion: 'State/Province',
      addressCity: 'City',
      addressStreet: 'Street Address',
      addressPostalCode: 'Postal Code',
      playerBiography: 'Player Biography',
      analysis: 'Analysis',
    };
    return labels[fieldName] || fieldName;
  }
}
