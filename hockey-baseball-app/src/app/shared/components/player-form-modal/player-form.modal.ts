import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { CardGridComponent } from '../card-grid/card-grid.component';
import { CardGridItemComponent } from '../card-grid/card-grid-item.component';
import { forkJoin, of } from 'rxjs';
import { Player } from '../../interfaces/player.interface';
import { Team } from '../../interfaces/team.interface';
import { TeamService } from '../../../services/team.service';
import { PositionService, PositionOption } from '../../../services/position.service';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { ModalService, ModalEvent } from '../../../services/modal.service';
import { getFieldError } from '../../validators/form-error.util';

export interface PlayerFormModalData {
  player?: Player;
  isEditMode: boolean;
  teams?: Team[];
  positions?: PositionOption[];
  teamId?: string;
  teamName?: string;
}

export interface TeamOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-player-form-modal',
  imports: [
    ReactiveFormsModule,
    SectionHeaderComponent,
    FormFieldComponent,
    CardGridComponent,
    CardGridItemComponent,
    ButtonComponent,
    ButtonLoadingComponent,
    LoadingSpinnerComponent,
  ],
  templateUrl: './player-form.modal.html',
  styleUrl: './player-form.modal.scss',
})
export class PlayerFormModal implements OnInit {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private teamService = inject(TeamService);
  private positionService = inject(PositionService);
  data = inject(ModalService).getModalData<PlayerFormModalData>();

  playerForm: FormGroup;
  isEditMode: boolean;
  isLoading = true;
  isSubmitting = signal(false);

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

    this.modalService.registerDirtyCheck(() => this.playerForm.dirty);
    this.modalService.onEvent$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event === ModalEvent.StopButtonLoading) {
        this.isSubmitting.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.loadFormData();
  }

  private loadFormData(): void {
    this.isLoading = true;

    const teamsObservable = this.data.teams
      ? of({ teams: this.data.teams, total: this.data.teams.length })
      : this.teamService.getTeams();

    const positionsObservable = this.data.positions
      ? of(this.data.positions)
      : this.positionService.getPositions();

    forkJoin({
      teams: teamsObservable,
      positions: positionsObservable,
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

      this.isSubmitting.set(true);
      this.modalService.closeWithDataProcessing(playerData);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.playerForm.controls).forEach((key) => {
        this.playerForm.get(key)?.markAsTouched();
      });
    }
  }

  onPositionSelected(value: string): void {
    this.playerForm.patchValue({ position: value });
  }

  onShootsSelected(value: string): void {
    this.playerForm.patchValue({ shoots: value });
  }

  onCancel(): void {
    this.modalService.closeModal();
  }

  private readonly fieldLabels: Record<string, string> = {
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

  getErrorMessage(fieldName: string): string {
    const control = this.playerForm.get(fieldName);
    const label = this.fieldLabels[fieldName] || fieldName;
    return getFieldError(control, label);
  }
}
