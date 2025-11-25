import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
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
import { GameEventService, PenaltyEventRequest } from '../../../services/game-event.service';
import { environment } from '../../../../environments/environment';

export interface PenaltyFormData {
  teamLogo: string;
  teamName: string;
  playerName: string;
  penaltyLength: string;
  period: string;
  time: string;
  youtubeLink?: string;
  location?: PuckLocation;
}

@Component({
  selector: 'app-penalty-form-modal',
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
    LocationSelectorComponent,
  ],
  templateUrl: './penalty-form-modal.html',
  styleUrl: './penalty-form-modal.scss',
})
export class PenaltyFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<PenaltyFormModalComponent>>(MatDialogRef);
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private gameMetadataService = inject(GameMetadataService);
  private gameEventService = inject(GameEventService);
  private dialogData = inject<{
    gameId: number;
    penaltyEventId: number;
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
      player2Id?: number;
      penaltyLength?: string;
      zone?: string;
      youtubeLink?: string;
      iceTopOffset?: number;
      iceLeftOffset?: number;
    };
  }>(MAT_DIALOG_DATA);

  gameId: number;
  penaltyEventId: number;
  isEditMode = false;
  eventId?: number;

  penaltyForm: FormGroup;
  puckLocation: PuckLocation | null = null;

  // Data to be loaded from API
  teamOptions: { value: number; label: string; logo?: string }[] = [];
  playersByTeam: Record<number, { value: number; label: string }[]> = {};
  playerOptions: { value: number; label: string }[] = [];
  penaltyDrawnPlayerOptions: { value: number; label: string }[] = [];
  periodOptions: { value: number; label: string }[] = [];

  isLoadingTeams = false;
  isLoadingPlayers = false;
  isLoadingPeriods = false;
  isSubmitting = false;

  constructor() {
    this.penaltyForm = this.createForm();
    this.gameId = this.dialogData.gameId;
    this.penaltyEventId = this.dialogData.penaltyEventId;
    this.isEditMode = this.dialogData.isEditMode || false;
    this.eventId = this.dialogData.eventId;
    this.setupTeamChangeListener();
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
      this.penaltyForm.patchValue({
        team: existing.teamId,
        player: existing.playerId,
        penaltyDrawnPlayer: existing.player2Id,
        penaltyLength: existing.penaltyLength,
        period: existing.periodId,
        time: existing.time,
        location: existing.zone,
        youtubeLink: existing.youtubeLink || '',
      });

      // Load players for the existing team
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
        this.penaltyForm.patchValue({ team: this.teamOptions[0].value });

        if (this.dialogData.playerOptions && this.dialogData.playerOptions.length > 0) {
          this.filterPlayersForTeam(this.teamOptions[0].value);
        } else {
          this.loadPlayersForTeam(this.teamOptions[0].value);
        }
      }

      if (this.periodOptions.length > 0) {
        this.penaltyForm.patchValue({ period: this.periodOptions[0].value });
      }
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      team: ['', Validators.required],
      player: ['', Validators.required],
      penaltyDrawnPlayer: [null as number | null],
      penaltyLength: [
        '',
        [Validators.required, Validators.pattern(/^([0-5]?[0-9]):([0-5][0-9])$/)],
      ],
      period: ['', Validators.required],
      time: ['', [Validators.required, Validators.pattern(/^([0-5]?[0-9]):([0-5][0-9])$/)]],
      youtubeLink: [''],
      location: [''],
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

        // Set default team after teams are loaded
        if (this.teamOptions.length > 0) {
          this.penaltyForm.patchValue({
            team: this.teamOptions[0].value,
          });
          // Load players for default team
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
          this.penaltyForm.patchValue({ period: this.periodOptions[0].value });
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

    // Check if we already have players cached for this team
    if (this.playersByTeam[teamId]) {
      this.playerOptions = this.playersByTeam[teamId];
      this.isLoadingPlayers = false;
      if (this.playerOptions.length > 0) {
        this.penaltyForm.patchValue({ player: this.playerOptions[0].value });
      }

      // Update penalty drawn players from preloaded data or cache
      this.updatePenaltyDrawnPlayers(teamId);
      return;
    }

    // If we have preloaded data, use it instead of API call
    if (this.dialogData.playerOptions && this.dialogData.playerOptions.length > 0) {
      this.filterPlayersForTeam(teamId);
      this.isLoadingPlayers = false;
      return;
    }

    // Only make API call if no preloaded data (fallback case)
    this.playerService.getPlayersByTeam(teamId).subscribe({
      next: (players) => {
        const playerOptions = players.map((player) => ({
          value: parseInt(player.id),
          label: `${player.firstName} ${player.lastName}`,
        }));

        // Cache the players
        this.playersByTeam[teamId] = playerOptions;
        this.playerOptions = playerOptions;
        this.isLoadingPlayers = false;

        if (this.playerOptions.length > 0) {
          this.penaltyForm.patchValue({ player: this.playerOptions[0].value });
        } else {
          this.penaltyForm.patchValue({ player: '' });
        }

        // Update penalty drawn players from preloaded data or cache
        this.updatePenaltyDrawnPlayers(teamId);
      },
      error: (error) => {
        console.error(`Failed to load players for team ${teamId}:`, error);
        this.isLoadingPlayers = false;
      },
    });
  }

  private updatePenaltyDrawnPlayers(teamId: number): void {
    const oppositeTeam = this.teamOptions.find((t) => t.value !== teamId);
    if (!oppositeTeam) {
      this.penaltyDrawnPlayerOptions = [];
      return;
    }

    // First, try preloaded data (most common case)
    if (this.dialogData.playerOptions && this.dialogData.playerOptions.length > 0) {
      this.penaltyDrawnPlayerOptions = this.dialogData.playerOptions
        .filter((player) => player.teamId === oppositeTeam.value)
        .map((player) => ({
          value: player.value,
          label: player.label,
        }));
      return;
    }

    // Then, try cache (if we loaded via API before)
    if (this.playersByTeam[oppositeTeam.value]) {
      this.penaltyDrawnPlayerOptions = this.playersByTeam[oppositeTeam.value];
      return;
    }

    // Only make API call as last resort (should rarely happen)
    this.playerService.getPlayersByTeam(oppositeTeam.value).subscribe({
      next: (players) => {
        const playerOptions = players.map((player) => ({
          value: parseInt(player.id),
          label: `${player.firstName} ${player.lastName}`,
        }));

        this.playersByTeam[oppositeTeam.value] = playerOptions;
        this.penaltyDrawnPlayerOptions = playerOptions;
      },
      error: (error) => {
        console.error(`Failed to load players for opposite team ${oppositeTeam.value}:`, error);
        this.penaltyDrawnPlayerOptions = [];
      },
    });
  }

  /**
   * Filter players from pre-loaded player options based on team
   */
  private filterPlayersForTeam(teamId: number): void {
    const oppositeTeam = this.teamOptions.find((t) => t.value !== teamId);

    if (this.dialogData.playerOptions) {
      const filteredPlayers = this.dialogData.playerOptions
        .filter((player) => player.teamId === teamId)
        .map((player) => ({
          value: player.value,
          label: player.label,
        }));

      // Cache the filtered players
      this.playersByTeam[teamId] = filteredPlayers;
      this.playerOptions = filteredPlayers;

      if (this.playerOptions.length > 0) {
        this.penaltyForm.patchValue({ player: this.playerOptions[0].value });
      } else {
        this.penaltyForm.patchValue({ player: '' });
      }

      // Filter penalty drawn players from the opposite team
      if (oppositeTeam) {
        this.penaltyDrawnPlayerOptions = this.dialogData.playerOptions
          .filter((player) => player.teamId === oppositeTeam.value)
          .map((player) => ({
            value: player.value,
            label: player.label,
          }));
      } else {
        this.penaltyDrawnPlayerOptions = [];
      }
    }
  }

  private setupTeamChangeListener(): void {
    const usePreloadedPlayers =
      this.dialogData.playerOptions && this.dialogData.playerOptions.length > 0;

    // When team changes, update available players
    this.penaltyForm.get('team')?.valueChanges.subscribe((team) => {
      if (usePreloadedPlayers) {
        this.filterPlayersForTeam(team);
      } else {
        this.loadPlayersForTeam(team);
      }
    });
  }

  selectTeam(teamValue: number): void {
    this.penaltyForm.patchValue({ team: teamValue });
    this.penaltyForm.get('team')?.markAsTouched();
  }

  selectPlayer(playerValue: number): void {
    this.penaltyForm.patchValue({ player: playerValue });
    this.penaltyForm.get('player')?.markAsTouched();
  }

  selectPenaltyDrawnPlayer(playerValue: number): void {
    this.penaltyForm.patchValue({ penaltyDrawnPlayer: playerValue });
    this.penaltyForm.get('penaltyDrawnPlayer')?.markAsTouched();
  }

  selectPeriod(periodValue: number): void {
    this.penaltyForm.patchValue({ period: periodValue });
    this.penaltyForm.get('period')?.markAsTouched();
  }

  onLocationChange(location: PuckLocation | null): void {
    this.puckLocation = location;
    if (location) {
      this.penaltyForm.patchValue({ location: location.zone });
    }
  }

  onSubmit(): void {
    if (this.penaltyForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const formValue = this.penaltyForm.value;

      // Convert mm:ss to time-of-day like shots (HH:mm:ss.SSSZ with 00 hours)
      const [minutes, seconds] = formValue.time.split(':').map((v: string) => parseInt(v, 10));
      const tmp = new Date(Date.UTC(1970, 0, 1, 0, minutes, seconds, 0));
      const iso = tmp.toISOString();
      const timeOfDay = iso.substring(iso.indexOf('T') + 1);

      // Convert penalty length to ISO 8601 duration (timedelta) format, e.g., PT2M30S
      const [penaltyMinutes, penaltySeconds] = formValue.penaltyLength
        .split(':')
        .map((v: string) => parseInt(v, 10));
      const mm = isNaN(penaltyMinutes) ? 0 : penaltyMinutes;
      const ss = isNaN(penaltySeconds) ? 0 : penaltySeconds;
      const timeLengthDuration = `PT${mm > 0 ? mm + 'M' : ''}${ss > 0 ? ss + 'S' : '0S'}`;

      const penaltyRequest: PenaltyEventRequest = {
        game_id: this.gameId,
        event_name_id: this.penaltyEventId,
        team_id: formValue.team,
        player_id: formValue.player,
        player_2_id: formValue.penaltyDrawnPlayer || undefined,
        period_id: formValue.period,
        time: timeOfDay,
        time_length: timeLengthDuration,
        youtube_link: formValue.youtubeLink || undefined,
        ice_top_offset: this.puckLocation?.y as number | undefined,
        ice_left_offset: this.puckLocation?.x as number | undefined,
        zone: this.puckLocation?.zone,
      };

      // Edit or create based on mode
      if (this.isEditMode && this.eventId) {
        this.gameEventService.updateGameEvent(this.eventId, penaltyRequest).subscribe({
          next: () => {
            this.isSubmitting = false;
            // Ensure caller always receives a truthy value to trigger refresh
            this.dialogRef.close(true);
          },
          error: (error) => {
            console.error('Failed to update penalty event:', error);
            this.isSubmitting = false;
            alert('Failed to update penalty event. Please try again.');
          },
        });
      } else {
        this.gameEventService.createPenaltyEvent(penaltyRequest).subscribe({
          next: () => {
            // Find selected team and player for display
            const selectedTeam = this.teamOptions.find((t) => t.value === formValue.team);
            const selectedPlayer = this.playerOptions.find((p) => p.value === formValue.player);

            const penaltyData: PenaltyFormData = {
              teamLogo: selectedTeam?.logo || '',
              teamName: selectedTeam?.label || '',
              playerName: selectedPlayer?.label || '',
              penaltyLength: formValue.penaltyLength,
              period: formValue.period.toString(),
              time: formValue.time,
              youtubeLink: formValue.youtubeLink,
              location: this.puckLocation || undefined,
            };

            this.isSubmitting = false;
            this.dialogRef.close(penaltyData);
          },
          error: (error) => {
            console.error('Failed to create penalty event:', error);
            this.isSubmitting = false;
          },
        });
      }
    } else if (!this.penaltyForm.valid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.penaltyForm.controls).forEach((key) => {
        this.penaltyForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.penaltyForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (control.errors['pattern']) {
        return 'Time must be in mm:ss format (e.g., 12:45)';
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      team: 'Team',
      player: 'Player',
      penaltyDrawnPlayer: 'Penalty Drawn Player',
      penaltyLength: 'Penalty Length',
      period: 'Period',
      time: 'Time',
      youtubeLink: 'YouTube Link',
      location: 'Location',
    };
    return labels[fieldName] || fieldName;
  }

  get selectedTeamData(): Team | undefined {
    const selectedTeamId = this.penaltyForm.get('team')?.value;
    if (!selectedTeamId) return undefined;

    const team = this.teamOptions.find((t) => t.value === selectedTeamId);
    if (!team) return undefined;

    return {
      name: team.label,
      logo: `${environment.apiUrl}/hockey/team/${selectedTeamId}/logo`,
    };
  }

  get otherTeamData(): Team | undefined {
    const selectedTeamId = this.penaltyForm.get('team')?.value;
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
