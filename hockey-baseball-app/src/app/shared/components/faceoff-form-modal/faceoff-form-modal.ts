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
import { LocationSelectorComponent, PuckLocation } from '../location-selector/location-selector';

import { TeamService } from '../../../services/team.service';
import { PlayerService } from '../../../services/player.service';
import { GameMetadataService } from '../../../services/game-metadata.service';
import { GameEventService, FaceoffEventRequest } from '../../../services/game-event.service';

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
    LocationSelectorComponent
  ],
  templateUrl: './faceoff-form-modal.html',
  styleUrl: './faceoff-form-modal.scss'
})
export class FaceoffFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<FaceoffFormModalComponent>>(MatDialogRef);
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private gameMetadataService = inject(GameMetadataService);
  private gameEventService = inject(GameEventService);
  private dialogData = inject<{ gameId: number; faceoffEventId: number }>(MAT_DIALOG_DATA);

  gameId: number;
  faceoffEventId: number;

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
    this.setupTeamChangeListeners();
  }

  ngOnInit(): void {
    this.loadTeams();
    this.loadPeriods();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      winnerTeam: ['', Validators.required],
      winnerPlayer: ['', Validators.required],
      loserTeam: ['', Validators.required],
      loserPlayer: ['', Validators.required],
      period: ['', Validators.required],
      time: ['', [Validators.required, Validators.pattern(/^([0-5]?[0-9]):([0-5][0-9])$/)]],
      location: [''],
      youtubeLink: ['']
    });
  }

  private loadTeams(): void {
    this.isLoadingTeams = true;
    this.teamService.getTeams().subscribe({
      next: (response) => {
        this.teamOptions = response.teams.map(team => ({
          value: parseInt(team.id),
          label: team.name,
          logo: team.logo
        }));
        this.isLoadingTeams = false;
        
        // Set default values after teams are loaded
        if (this.teamOptions.length > 1) {
          this.faceoffForm.patchValue({
            winnerTeam: this.teamOptions[0].value,
            loserTeam: this.teamOptions[1].value
          });
          // Load players for both teams
          this.loadPlayersForTeam(this.teamOptions[0].value, 'winner');
          this.loadPlayersForTeam(this.teamOptions[1].value, 'loser');
        }
      },
      error: (error) => {
        console.error('Failed to load teams:', error);
        this.isLoadingTeams = false;
      }
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
      }
    });
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
        const playerOptions = players.map(player => ({
          value: parseInt(player.id),
          label: `${player.firstName} ${player.lastName}`
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
      }
    });
  }

  private setupTeamChangeListeners(): void {
    // When winner team changes, automatically set loser team to the opposite and update players
    this.faceoffForm.get('winnerTeam')?.valueChanges.subscribe(winnerTeam => {
      const loserTeam = this.teamOptions.find(t => t.value !== winnerTeam);
      if (loserTeam) {
        this.faceoffForm.patchValue({ loserTeam: loserTeam.value }, { emitEvent: false });
        // Manually update loser players since we disabled event emission
        this.loadPlayersForTeam(loserTeam.value, 'loser');
      }
      this.loadPlayersForTeam(winnerTeam, 'winner');
    });

    // When loser team changes, automatically set winner team to the opposite and update players
    this.faceoffForm.get('loserTeam')?.valueChanges.subscribe(loserTeam => {
      const winnerTeam = this.teamOptions.find(t => t.value !== loserTeam);
      if (winnerTeam) {
        this.faceoffForm.patchValue({ winnerTeam: winnerTeam.value }, { emitEvent: false });
        // Manually update winner players since we disabled event emission
        this.loadPlayersForTeam(winnerTeam.value, 'winner');
      }
      this.loadPlayersForTeam(loserTeam, 'loser');
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
      
      // Convert time from mm:ss to ISO duration format
      const [minutes, seconds] = formValue.time.split(':').map((v: string) => parseInt(v, 10));
      const isoTime = new Date();
      isoTime.setHours(0, minutes, seconds, 0);
      
      // Determine which team won (is_faceoff_won is true for winner team)
      // Submit the faceoff event with winner's team and both players
      
      const faceoffRequest: FaceoffEventRequest = {
        game_id: this.gameId,
        event_name_id: this.faceoffEventId,
        team_id: formValue.winnerTeam,
        player_id: formValue.winnerPlayer,
        player_2_id: formValue.loserPlayer,
        period_id: formValue.period,
        time: isoTime.toISOString(),
        youtube_link: formValue.youtubeLink || undefined,
        ice_top_offset: this.puckLocation?.y as number | undefined,
        ice_left_offset: this.puckLocation?.x as number | undefined,
        zone: this.puckLocation?.zone,
        is_faceoff_won: true
      };

      this.gameEventService.createFaceoffEvent(faceoffRequest).subscribe({
        next: (response) => {
          console.log('Faceoff event created:', response);
          
          // Find selected teams and players for display
          const winnerTeam = this.teamOptions.find(t => t.value === formValue.winnerTeam);
          const loserTeam = this.teamOptions.find(t => t.value === formValue.loserTeam);
          const winnerPlayer = this.winnerPlayerOptions.find(p => p.value === formValue.winnerPlayer);
          const loserPlayer = this.loserPlayerOptions.find(p => p.value === formValue.loserPlayer);
          
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
            youtubeLink: formValue.youtubeLink
          };
          
          this.isSubmitting = false;
          this.dialogRef.close(faceoffData);
        },
        error: (error) => {
          console.error('Failed to create faceoff event:', error);
          this.isSubmitting = false;
          // Optionally show error message to user
        }
      });
    } else if (!this.faceoffForm.valid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.faceoffForm.controls).forEach(key => {
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
        return 'Time must be in mm:ss format (e.g., 12:45)';
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
      youtubeLink: 'YouTube Link'
    };
    return labels[fieldName] || fieldName;
  }
}
