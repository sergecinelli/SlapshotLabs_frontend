import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import {
  LocationSelectorComponent,
  PuckLocation,
  Team,
} from '../location-selector/location-selector';
import { TeamService } from '../../../services/team.service';
import { PlayerService } from '../../../services/player.service';
import { GameMetadataService } from '../../../services/game-metadata.service';
import { GameEventService, TurnoverEventRequest } from '../../../services/game-event.service';
import { environment } from '../../../../environments/environment';

export interface TurnoverFormData {
  teamLogo: string;
  teamName: string;
  playerNames: string[];
  period: string;
  time: string;
  location?: PuckLocation;
  youtubeLink?: string;
}

@Component({
  selector: 'app-turnover-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    ButtonComponent,
    ButtonLoadingComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule,
    LocationSelectorComponent,
  ],
  templateUrl: './turnover-form-modal.html',
  styleUrl: './turnover-form-modal.scss',
})
export class TurnoverFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<TurnoverFormModalComponent>>(MatDialogRef);
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private gameMetadataService = inject(GameMetadataService);
  private gameEventService = inject(GameEventService);
  private dialogData = inject<{
    gameId: number;
    turnoverEventId: number;
    periodOptions?: { value: number; label: string }[];
    teamOptions?: { value: number; label: string; logo?: string }[];
    playerOptions?: { value: number; label: string; teamId: number }[];
    // Edit mode fields
    isEditMode?: boolean;
    eventId?: number;
    existingData?: {
      periodId?: number;
      time?: string;
      teamId?: number;
      playerId?: number;
      zone?: string;
      youtubeLink?: string;
      iceTopOffset?: number;
      iceLeftOffset?: number;
    };
  }>(MAT_DIALOG_DATA);

  gameId: number;
  turnoverEventId: number;
  isEditMode = false;
  eventId?: number;

  turnoverForm: FormGroup;
  puckLocation: PuckLocation | null = null;

  // Data to be loaded from API
  teamOptions: { value: number; label: string; logo?: string }[] = [];
  playerOptions: { value: number; label: string }[] = [];
  periodOptions: { value: number; label: string }[] = [];

  isLoadingTeams = false;
  isLoadingPlayers = false;
  isLoadingPeriods = false;
  isSubmitting = false;

  constructor() {
    this.turnoverForm = this.createForm();
    this.gameId = this.dialogData.gameId;
    this.turnoverEventId = this.dialogData.turnoverEventId;
    this.isEditMode = this.dialogData.isEditMode || false;
    this.eventId = this.dialogData.eventId;
  }

  ngOnInit(): void {
    // Load options
    if (this.dialogData.teamOptions && this.dialogData.teamOptions.length > 0) {
      this.teamOptions = this.dialogData.teamOptions;
    } else {
      this.loadTeams();
    }

    if (this.dialogData.periodOptions && this.dialogData.periodOptions.length > 0) {
      this.periodOptions = this.dialogData.periodOptions;
    } else {
      this.loadPeriods();
    }

    // Edit mode: populate with existing data
    if (this.isEditMode && this.dialogData.existingData) {
      const existing = this.dialogData.existingData;

      // Restore location if available
      if (
        existing.iceTopOffset !== undefined &&
        existing.iceLeftOffset !== undefined &&
        existing.zone
      ) {
        this.puckLocation = {
          x: existing.iceLeftOffset,
          y: existing.iceTopOffset,
          zone: (existing.zone as 'defending' | 'neutral' | 'attacking') ?? 'defending',
        };
      }

      // Populate form
      this.turnoverForm.patchValue({
        team: existing.teamId,
        player: existing.playerId,
        period: existing.periodId,
        time: existing.time,
        location: existing.zone,
        youtubeLink: existing.youtubeLink || '',
      });

      // Filter players for the existing team
      if (existing.teamId) {
        if (this.dialogData.playerOptions && this.dialogData.playerOptions.length > 0) {
          this.filterPlayersForTeam(existing.teamId);
        } else {
          this.loadPlayersForTeam(existing.teamId);
        }
      }
    } else {
      // Create mode: Set defaults
      if (this.teamOptions.length > 0) {
        this.turnoverForm.patchValue({ team: this.teamOptions[0].value });

        if (this.dialogData.playerOptions && this.dialogData.playerOptions.length > 0) {
          this.filterPlayersForTeam(this.teamOptions[0].value);
        } else {
          this.loadPlayersForTeam(this.teamOptions[0].value);
        }
      }

      if (this.periodOptions.length > 0) {
        this.turnoverForm.patchValue({ period: this.periodOptions[0].value });
      }
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      team: ['', Validators.required],
      player: ['', Validators.required],
      period: ['', Validators.required],
      time: ['', [Validators.required, Validators.pattern(/^([0-9]{1,2}|1[0-9][0-9]|200):([0-5][0-9])$/)]],
      location: ['', Validators.required],
      youtubeLink: [''],
    });
  }

  private loadTeams(): void {
    this.isLoadingTeams = true;
    this.teamService.getTeams().subscribe({
      next: (response) => {
        this.teamOptions = response.teams.map((team) => ({
          value: parseInt(team.id),
          label: team.name,
          logo: team.logo,
        }));
        this.isLoadingTeams = false;
        if (this.teamOptions.length > 0) {
          this.turnoverForm.patchValue({ team: this.teamOptions[0].value });
          this.loadPlayersForTeam(this.teamOptions[0].value);
        }
      },
      error: (error) => {
        console.error('Failed to load teams:', error);
        this.isLoadingTeams = false;
      },
    });
  }

  private loadPeriods(): void {
    this.isLoadingPeriods = true;
    this.gameMetadataService.getGamePeriods().subscribe({
      next: (periods) => {
        this.periodOptions = this.gameMetadataService.transformGamePeriodsToOptions(periods);
        this.isLoadingPeriods = false;
        if (this.periodOptions.length > 0) {
          this.turnoverForm.patchValue({ period: this.periodOptions[0].value });
        }
      },
      error: (error) => {
        console.error('Failed to load periods:', error);
        this.isLoadingPeriods = false;
      },
    });
  }

  private loadPlayersForTeam(teamId: number): void {
    this.isLoadingPlayers = true;
    this.playerService.getPlayersByTeam(teamId).subscribe({
      next: (players) => {
        this.playerOptions = players.map((player) => ({
          value: parseInt(player.id),
          label: `${player.firstName} ${player.lastName}`,
        }));
        this.isLoadingPlayers = false;
        if (this.playerOptions.length > 0) {
          this.turnoverForm.patchValue({ player: this.playerOptions[0].value });
        } else {
          this.turnoverForm.patchValue({ player: '' });
        }
      },
      error: (error) => {
        console.error('Failed to load players:', error);
        this.isLoadingPlayers = false;
      },
    });
  }

  selectTeam(teamValue: number): void {
    this.turnoverForm.patchValue({ team: teamValue });
    this.turnoverForm.get('team')?.markAsTouched();
    // When team changes, update available players
    if (this.dialogData.playerOptions && this.dialogData.playerOptions.length > 0) {
      this.filterPlayersForTeam(teamValue);
    } else {
      this.loadPlayersForTeam(teamValue);
    }
  }

  /**
   * Filter players from pre-loaded player options based on team
   */
  private filterPlayersForTeam(teamId: number): void {
    if (this.dialogData.playerOptions) {
      this.playerOptions = this.dialogData.playerOptions
        .filter((player) => player.teamId === teamId)
        .map((player) => ({
          value: player.value,
          label: player.label,
        }));

      if (this.playerOptions.length > 0) {
        this.turnoverForm.patchValue({ player: this.playerOptions[0].value });
      } else {
        this.turnoverForm.patchValue({ player: '' });
      }
    }
  }

  selectPlayer(playerValue: number): void {
    this.turnoverForm.patchValue({ player: playerValue });
    this.turnoverForm.get('player')?.markAsTouched();
  }

  selectPeriod(periodValue: number): void {
    this.turnoverForm.patchValue({ period: periodValue });
    this.turnoverForm.get('period')?.markAsTouched();
  }

  onLocationChange(location: PuckLocation | null): void {
    this.puckLocation = location;
    if (location) {
      this.turnoverForm.patchValue({ location: location.zone });
    }
  }

  onSubmit(): void {
    if (this.turnoverForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const formValue = this.turnoverForm.value;

      // Convert time from mm:ss to time-of-day format HH:mm:ss.SSSZ
      const [minutes, seconds] = formValue.time.split(':').map((v: string) => parseInt(v, 10));

      // Always send as 00:mm:ss.000Z regardless of game start time
      const tmp = new Date(Date.UTC(1970, 0, 1, 0, minutes, seconds, 0));
      const iso = tmp.toISOString();
      const timeOfDay = iso.substring(iso.indexOf('T') + 1); // HH:mm:ss.SSSZ

      const turnoverRequest: TurnoverEventRequest = {
        game_id: this.gameId,
        event_name_id: this.turnoverEventId,
        team_id: formValue.team,
        player_id: formValue.player,
        period_id: formValue.period,
        time: timeOfDay,
        youtube_link: formValue.youtubeLink || undefined,
        ice_top_offset: this.puckLocation?.y as number | undefined,
        ice_left_offset: this.puckLocation?.x as number | undefined,
        zone: this.puckLocation?.zone,
      };

      // Edit or create based on mode
      if (this.isEditMode && this.eventId) {
        this.gameEventService.updateGameEvent(this.eventId, turnoverRequest).subscribe({
          next: () => {
            this.isSubmitting = false;
            // Ensure caller always receives a truthy value to trigger refresh
            this.dialogRef.close(true);
          },
          error: (error) => {
            console.error('Failed to update turnover event:', error);
            this.isSubmitting = false;
            alert('Failed to update turnover event. Please try again.');
          },
        });
      } else {
        this.gameEventService.createTurnoverEvent(turnoverRequest).subscribe({
          next: () => {
            // Find selected team and player for display
            const selectedTeam = this.teamOptions.find((t) => t.value === formValue.team);
            const selectedPlayer = this.playerOptions.find((p) => p.value === formValue.player);

            const turnoverData: TurnoverFormData = {
              teamLogo: selectedTeam?.logo || '',
              teamName: selectedTeam?.label || '',
              playerNames: [selectedPlayer?.label || ''],
              period: formValue.period.toString(),
              time: formValue.time,
              location: this.puckLocation || undefined,
              youtubeLink: formValue.youtubeLink,
            };

            this.isSubmitting = false;
            this.dialogRef.close(turnoverData);
          },
          error: (error) => {
            console.error('Failed to create turnover event:', error);
            this.isSubmitting = false;
          },
        });
      }
    } else if (!this.turnoverForm.valid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.turnoverForm.controls).forEach((key) => {
        this.turnoverForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.turnoverForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (control.errors['pattern']) {
        return 'Time must be in mm:ss format (max 200:00)';
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      team: 'Team',
      player: 'Player',
      period: 'Period',
      time: 'Time',
      location: 'Location',
      youtubeLink: 'YouTube Link',
    };
    return labels[fieldName] || fieldName;
  }

  get selectedTeamData(): Team | undefined {
    const selectedTeamId = this.turnoverForm.get('team')?.value;
    if (!selectedTeamId) return undefined;

    const team = this.teamOptions.find((t) => t.value === selectedTeamId);
    if (!team) return undefined;

    return {
      name: team.label,
      logo: `${environment.apiUrl}/hockey/team/${selectedTeamId}/logo`,
    };
  }

  get otherTeamData(): Team | undefined {
    const selectedTeamId = this.turnoverForm.get('team')?.value;
    if (!selectedTeamId) return undefined;

    const otherTeam = this.teamOptions.find((t) => t.value !== selectedTeamId);
    if (!otherTeam) return undefined;

    return {
      name: otherTeam.label,
      logo: `${environment.apiUrl}/hockey/team/${otherTeam.value}/logo`,
    };
  }

  getTeamLogoUrl(teamId: number): string {
    return `${environment.apiUrl}/hockey/team/${teamId}/logo`;
  }
}
