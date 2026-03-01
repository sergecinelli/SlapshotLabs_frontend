import { Component, inject, OnInit , ChangeDetectionStrategy } from '@angular/core';

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
} from '../location-selector/location-selector.component';

import { TeamService } from '../../../services/team.service';
import { PlayerService } from '../../../services/player.service';
import { GameMetadataService } from '../../../services/game-metadata.service';
import { GameEventService, FaceoffEventRequest } from '../../../services/game-event.service';
import { environment } from '../../../../environments/environment';

export interface FaceoffFormData {
  winnerTeamLogo: string;
  winnerTeamName: string;
  winnerPlayerName: string;
  loserTeamLogo: string;
  loserTeamName: string;
  loserPlayerName: string;
  period: string;
  time: string;
  location?: PuckLocation;
  youtubeLink?: string;
}

@Component({
  selector: 'app-faceoff-form-modal',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    ButtonComponent,
    ButtonLoadingComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule,
    LocationSelectorComponent
],
  templateUrl: './faceoff-form.modal.html',
  styleUrl: './faceoff-form.modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaceoffFormModal implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<FaceoffFormModal>>(MatDialogRef);
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private gameMetadataService = inject(GameMetadataService);
  private gameEventService = inject(GameEventService);
  private dialogData = inject<{
    gameId: number;
    faceoffEventId: number;
    periodOptions?: { value: number; label: string }[];
    teamOptions?: { value: number; label: string; logo?: string }[];
    playerOptions?: { value: number; label: string; teamId: number }[];
    // Edit mode fields
    isEditMode?: boolean;
    eventId?: number;
    existingData?: {
      periodId?: number;
      time?: string;
      winnerTeamId?: number;
      winnerPlayerId?: number;
      loserPlayerId?: number;
      zone?: string;
      youtubeLink?: string;
      iceTopOffset?: number;
      iceLeftOffset?: number;
      isFaceoffWon?: boolean;
    };
  }>(MAT_DIALOG_DATA);

  gameId: number;
  faceoffEventId: number;
  isEditMode = false;
  eventId?: number;

  faceoffForm: FormGroup;
  puckLocation: PuckLocation | null = null;

  // Data to be loaded from API
  teamOptions: { value: number; label: string; logo?: string }[] = [];
  playersByTeam: Record<number, { value: number; label: string }[]> = {};
  winnerPlayerOptions: { value: number; label: string }[] = [];
  loserPlayerOptions: { value: number; label: string }[] = [];
  periodOptions: { value: number; label: string }[] = [];

  isLoadingTeams = false;
  isLoadingWinnerPlayers = false;
  isLoadingLoserPlayers = false;
  isLoadingPeriods = false;
  isSubmitting = false;

  constructor() {
    this.faceoffForm = this.createForm();
    this.gameId = this.dialogData.gameId;
    this.faceoffEventId = this.dialogData.faceoffEventId;
    this.isEditMode = this.dialogData.isEditMode || false;
    this.eventId = this.dialogData.eventId;
    this.setupTeamChangeListeners();
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

      // Find loser team (opposite of winner)
      const loserTeam = this.teamOptions.find((t) => t.value !== existing.winnerTeamId);

      // Populate form
      this.faceoffForm.patchValue({
        winnerTeam: existing.winnerTeamId,
        loserTeam: loserTeam?.value,
        winnerPlayer: existing.winnerPlayerId,
        loserPlayer: existing.loserPlayerId,
        period: existing.periodId,
        time: existing.time,
        location: existing.zone,
        youtubeLink: existing.youtubeLink || '',
      });

      // Load players for both teams
      if (existing.winnerTeamId) {
        if (this.dialogData.playerOptions && this.dialogData.playerOptions.length > 0) {
          this.filterPlayersForTeam(existing.winnerTeamId, 'winner');
        } else {
          this.loadPlayersForTeam(existing.winnerTeamId, 'winner');
        }
      }
      if (loserTeam && this.dialogData.playerOptions && this.dialogData.playerOptions.length > 0) {
        this.filterPlayersForTeam(loserTeam.value, 'loser');
      } else if (loserTeam) {
        this.loadPlayersForTeam(loserTeam.value, 'loser');
      }
    } else {
      // Create mode: Set defaults
      if (this.teamOptions.length > 1) {
        this.faceoffForm.patchValue({
          winnerTeam: this.teamOptions[0].value,
          loserTeam: this.teamOptions[1].value,
        });

        if (this.dialogData.playerOptions && this.dialogData.playerOptions.length > 0) {
          this.filterPlayersForTeam(this.teamOptions[0].value, 'winner');
          this.filterPlayersForTeam(this.teamOptions[1].value, 'loser');
        } else {
          this.loadPlayersForTeam(this.teamOptions[0].value, 'winner');
          this.loadPlayersForTeam(this.teamOptions[1].value, 'loser');
        }
      }

      if (this.periodOptions.length > 0) {
        this.faceoffForm.patchValue({ period: this.periodOptions[0].value });
      }
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      winnerTeam: ['', Validators.required],
      winnerPlayer: ['', Validators.required],
      loserTeam: ['', Validators.required],
      loserPlayer: ['', Validators.required],
      period: ['', Validators.required],
      time: ['', [Validators.required, Validators.pattern(/^([0-9]{1,2}|1[0-9][0-9]|200):([0-5][0-9])$/)]],
      location: [''],
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

        // Set default values after teams are loaded
        if (this.teamOptions.length > 1) {
          this.faceoffForm.patchValue({
            winnerTeam: this.teamOptions[0].value,
            loserTeam: this.teamOptions[1].value,
          });
          // Load players for both teams
          this.loadPlayersForTeam(this.teamOptions[0].value, 'winner');
          this.loadPlayersForTeam(this.teamOptions[1].value, 'loser');
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
          this.faceoffForm.patchValue({ period: this.periodOptions[0].value });
        }
      },
      error: (error) => {
        console.error('Failed to load periods:', error);
        this.isLoadingPeriods = false;
      },
    });
  }

  /**
   * Filter players from pre-loaded player options based on team
   */
  private filterPlayersForTeam(teamId: number, teamType: 'winner' | 'loser'): void {
    if (this.dialogData.playerOptions) {
      const filteredPlayers = this.dialogData.playerOptions
        .filter((player) => player.teamId === teamId)
        .map((player) => ({
          value: player.value,
          label: player.label,
        }));

      // Cache the filtered players
      this.playersByTeam[teamId] = filteredPlayers;

      if (teamType === 'winner') {
        this.winnerPlayerOptions = filteredPlayers;
        if (this.winnerPlayerOptions.length > 0) {
          this.faceoffForm.patchValue({ winnerPlayer: this.winnerPlayerOptions[0].value });
        } else {
          this.faceoffForm.patchValue({ winnerPlayer: '' });
        }
      } else {
        this.loserPlayerOptions = filteredPlayers;
        if (this.loserPlayerOptions.length > 0) {
          this.faceoffForm.patchValue({ loserPlayer: this.loserPlayerOptions[0].value });
        } else {
          this.faceoffForm.patchValue({ loserPlayer: '' });
        }
      }
    }
  }

  private loadPlayersForTeam(teamId: number, teamType: 'winner' | 'loser'): void {
    if (teamType === 'winner') {
      this.isLoadingWinnerPlayers = true;
    } else {
      this.isLoadingLoserPlayers = true;
    }

    // Check if we already have players cached for this team
    if (this.playersByTeam[teamId]) {
      if (teamType === 'winner') {
        this.winnerPlayerOptions = this.playersByTeam[teamId];
        this.isLoadingWinnerPlayers = false;
        if (this.winnerPlayerOptions.length > 0) {
          this.faceoffForm.patchValue({ winnerPlayer: this.winnerPlayerOptions[0].value });
        }
      } else {
        this.loserPlayerOptions = this.playersByTeam[teamId];
        this.isLoadingLoserPlayers = false;
        if (this.loserPlayerOptions.length > 0) {
          this.faceoffForm.patchValue({ loserPlayer: this.loserPlayerOptions[0].value });
        }
      }
      return;
    }

    this.playerService.getPlayersByTeam(teamId).subscribe({
      next: (players) => {
        const playerOptions = players.map((player) => ({
          value: parseInt(player.id),
          label: `${player.firstName} ${player.lastName}`,
        }));

        // Cache the players
        this.playersByTeam[teamId] = playerOptions;

        if (teamType === 'winner') {
          this.winnerPlayerOptions = playerOptions;
          this.isLoadingWinnerPlayers = false;
          if (this.winnerPlayerOptions.length > 0) {
            this.faceoffForm.patchValue({ winnerPlayer: this.winnerPlayerOptions[0].value });
          } else {
            this.faceoffForm.patchValue({ winnerPlayer: '' });
          }
        } else {
          this.loserPlayerOptions = playerOptions;
          this.isLoadingLoserPlayers = false;
          if (this.loserPlayerOptions.length > 0) {
            this.faceoffForm.patchValue({ loserPlayer: this.loserPlayerOptions[0].value });
          } else {
            this.faceoffForm.patchValue({ loserPlayer: '' });
          }
        }
      },
      error: (error) => {
        console.error(`Failed to load players for team ${teamId}:`, error);
        if (teamType === 'winner') {
          this.isLoadingWinnerPlayers = false;
        } else {
          this.isLoadingLoserPlayers = false;
        }
      },
    });
  }

  private setupTeamChangeListeners(): void {
    const usePreloadedPlayers =
      this.dialogData.playerOptions && this.dialogData.playerOptions.length > 0;

    // When winner team changes, automatically set loser team to the opposite and update players
    this.faceoffForm.get('winnerTeam')?.valueChanges.subscribe((winnerTeam) => {
      const loserTeam = this.teamOptions.find((t) => t.value !== winnerTeam);
      if (loserTeam) {
        this.faceoffForm.patchValue({ loserTeam: loserTeam.value }, { emitEvent: false });
        // Manually update loser players since we disabled event emission
        if (usePreloadedPlayers) {
          this.filterPlayersForTeam(loserTeam.value, 'loser');
        } else {
          this.loadPlayersForTeam(loserTeam.value, 'loser');
        }
      }
      if (usePreloadedPlayers) {
        this.filterPlayersForTeam(winnerTeam, 'winner');
      } else {
        this.loadPlayersForTeam(winnerTeam, 'winner');
      }
    });

    // When loser team changes, automatically set winner team to the opposite and update players
    this.faceoffForm.get('loserTeam')?.valueChanges.subscribe((loserTeam) => {
      const winnerTeam = this.teamOptions.find((t) => t.value !== loserTeam);
      if (winnerTeam) {
        this.faceoffForm.patchValue({ winnerTeam: winnerTeam.value }, { emitEvent: false });
        // Manually update winner players since we disabled event emission
        if (usePreloadedPlayers) {
          this.filterPlayersForTeam(winnerTeam.value, 'winner');
        } else {
          this.loadPlayersForTeam(winnerTeam.value, 'winner');
        }
      }
      if (usePreloadedPlayers) {
        this.filterPlayersForTeam(loserTeam, 'loser');
      } else {
        this.loadPlayersForTeam(loserTeam, 'loser');
      }
    });
  }

  selectWinnerTeam(teamValue: number): void {
    this.faceoffForm.patchValue({ winnerTeam: teamValue });
    this.faceoffForm.get('winnerTeam')?.markAsTouched();
  }

  selectWinnerPlayer(playerValue: number): void {
    this.faceoffForm.patchValue({ winnerPlayer: playerValue });
    this.faceoffForm.get('winnerPlayer')?.markAsTouched();
  }

  selectLoserTeam(teamValue: number): void {
    this.faceoffForm.patchValue({ loserTeam: teamValue });
    this.faceoffForm.get('loserTeam')?.markAsTouched();
  }

  selectLoserPlayer(playerValue: number): void {
    this.faceoffForm.patchValue({ loserPlayer: playerValue });
    this.faceoffForm.get('loserPlayer')?.markAsTouched();
  }

  selectPeriod(periodValue: number): void {
    this.faceoffForm.patchValue({ period: periodValue });
    this.faceoffForm.get('period')?.markAsTouched();
  }

  onLocationChange(location: PuckLocation | null): void {
    this.puckLocation = location;
    if (location) {
      this.faceoffForm.patchValue({ location: location.zone });
    }
  }

  onSubmit(): void {
    if (this.faceoffForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const formValue = this.faceoffForm.value;

      // Convert mm:ss to time-of-day like shots (HH:mm:ss.SSSZ with 00 hours)
      const [minutes, seconds] = formValue.time.split(':').map((v: string) => parseInt(v, 10));
      const tmp = new Date(Date.UTC(1970, 0, 1, 0, minutes, seconds, 0));
      const iso = tmp.toISOString();
      const timeOfDay = iso.substring(iso.indexOf('T') + 1);

      const faceoffRequest: FaceoffEventRequest = {
        game_id: this.gameId,
        event_name_id: this.faceoffEventId,
        team_id: formValue.winnerTeam,
        player_id: formValue.winnerPlayer,
        player_2_id: formValue.loserPlayer,
        period_id: formValue.period,
        time: timeOfDay,
        youtube_link: formValue.youtubeLink || undefined,
        ice_top_offset: this.puckLocation?.y as number | undefined,
        ice_left_offset: this.puckLocation?.x as number | undefined,
        zone: this.puckLocation?.zone,
      };

      // Edit or create based on mode
      if (this.isEditMode && this.eventId) {
        this.gameEventService.updateGameEvent(this.eventId, faceoffRequest).subscribe({
          next: () => {
            this.isSubmitting = false;
            // Ensure caller always receives a truthy value to trigger refresh
            this.dialogRef.close(true);
          },
          error: (error) => {
            console.error('Failed to update faceoff event:', error);
            this.isSubmitting = false;
            alert('Failed to update faceoff event. Please try again.');
          },
        });
      } else {
        this.gameEventService.createFaceoffEvent(faceoffRequest).subscribe({
          next: () => {
            // Find selected teams and players for display
            const winnerTeam = this.teamOptions.find((t) => t.value === formValue.winnerTeam);
            const loserTeam = this.teamOptions.find((t) => t.value === formValue.loserTeam);
            const winnerPlayer = this.winnerPlayerOptions.find(
              (p) => p.value === formValue.winnerPlayer
            );
            const loserPlayer = this.loserPlayerOptions.find(
              (p) => p.value === formValue.loserPlayer
            );

            const faceoffData: FaceoffFormData = {
              winnerTeamLogo: winnerTeam?.logo || '',
              winnerTeamName: winnerTeam?.label || '',
              winnerPlayerName: winnerPlayer?.label || '',
              loserTeamLogo: loserTeam?.logo || '',
              loserTeamName: loserTeam?.label || '',
              loserPlayerName: loserPlayer?.label || '',
              period: formValue.period.toString(),
              time: formValue.time,
              location: this.puckLocation || undefined,
              youtubeLink: formValue.youtubeLink,
            };

            this.isSubmitting = false;
            this.dialogRef.close(faceoffData);
          },
          error: (error) => {
            console.error('Failed to create faceoff event:', error);
            this.isSubmitting = false;
          },
        });
      }
    } else if (!this.faceoffForm.valid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.faceoffForm.controls).forEach((key) => {
        this.faceoffForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.faceoffForm.get(fieldName);
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
      winnerTeam: 'Faceoff Winner Team',
      winnerPlayer: 'Faceoff Winner Player',
      loserTeam: 'Faceoff Loser Team',
      loserPlayer: 'Faceoff Loser Player',
      period: 'Period',
      time: 'Time',
      location: 'Location',
      youtubeLink: 'YouTube Link',
    };
    return labels[fieldName] || fieldName;
  }

  get winnerTeamData(): Team | undefined {
    const winnerTeamId = this.faceoffForm.get('winnerTeam')?.value;
    if (!winnerTeamId) return undefined;

    const team = this.teamOptions.find((t) => t.value === winnerTeamId);
    if (!team) return undefined;

    return {
      name: team.label,
      logo: `${environment.apiUrl}/hockey/team/${winnerTeamId}/logo`,
    };
  }

  get loserTeamData(): Team | undefined {
    const loserTeamId = this.faceoffForm.get('loserTeam')?.value;
    if (!loserTeamId) return undefined;

    const team = this.teamOptions.find((t) => t.value === loserTeamId);
    if (!team) return undefined;

    return {
      name: team.label,
      logo: `${environment.apiUrl}/hockey/team/${loserTeamId}/logo`,
    };
  }

  getTeamLogoUrl(teamId: number): string {
    return `${environment.apiUrl}/hockey/team/${teamId}/logo`;
  }
}
