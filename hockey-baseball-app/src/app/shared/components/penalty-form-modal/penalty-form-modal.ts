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
import { GameEventService, PenaltyEventRequest } from '../../../services/game-event.service';

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
    LocationSelectorComponent
  ],
  templateUrl: './penalty-form-modal.html',
  styleUrl: './penalty-form-modal.scss'
})
export class PenaltyFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<PenaltyFormModalComponent>>(MatDialogRef);
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private gameMetadataService = inject(GameMetadataService);
  private gameEventService = inject(GameEventService);
  private dialogData = inject<{ gameId: number; penaltyEventId: number }>(MAT_DIALOG_DATA);

  gameId: number;
  penaltyEventId: number;

  penaltyForm: FormGroup;
  puckLocation: PuckLocation | null = null;

  // Data to be loaded from API
  teamOptions: { value: number; label: string; logo?: string }[] = [];
  playersByTeam: Record<number, { value: number; label: string }[]> = {};
  playerOptions: { value: number; label: string }[] = [];
  periodOptions: { value: number; label: string }[] = [];

  isLoadingTeams = false;
  isLoadingPlayers = false;
  isLoadingPeriods = false;
  isSubmitting = false;

  constructor() {
    this.penaltyForm = this.createForm();
    this.gameId = this.dialogData.gameId;
    this.penaltyEventId = this.dialogData.penaltyEventId;
    this.setupTeamChangeListener();
  }

  ngOnInit(): void {
    this.loadTeams();
    this.loadPeriods();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      team: ['', Validators.required],
      player: ['', Validators.required],
      penaltyLength: ['', [Validators.required, Validators.pattern(/^([0-5]?[0-9]):([0-5][0-9])$/)]],
      period: ['', Validators.required],
      time: ['', [Validators.required, Validators.pattern(/^([0-5]?[0-9]):([0-5][0-9])$/)]],
      youtubeLink: [''],
      location: ['']
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
        
        // Set default team after teams are loaded
        if (this.teamOptions.length > 0) {
          this.penaltyForm.patchValue({
            team: this.teamOptions[0].value
          });
          // Load players for default team
          this.loadPlayersForTeam(this.teamOptions[0].value);
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
          this.penaltyForm.patchValue({ period: this.periodOptions[0].value });
        }
      },
      error: (error) => {
        console.error('Failed to load periods:', error);
        this.isLoadingPeriods = false;
      }
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
        this.playerOptions = playerOptions;
        this.isLoadingPlayers = false;
        
        if (this.playerOptions.length > 0) {
          this.penaltyForm.patchValue({ player: this.playerOptions[0].value });
        } else {
          this.penaltyForm.patchValue({ player: '' });
        }
      },
      error: (error) => {
        console.error(`Failed to load players for team ${teamId}:`, error);
        this.isLoadingPlayers = false;
      }
    });
  }

  private setupTeamChangeListener(): void {
    // When team changes, update available players
    this.penaltyForm.get('team')?.valueChanges.subscribe(team => {
      this.loadPlayersForTeam(team);
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
      
      // Convert time from mm:ss to ISO duration format
      const [minutes, seconds] = formValue.time.split(':').map((v: string) => parseInt(v, 10));
      const isoTime = new Date();
      isoTime.setHours(0, minutes, seconds, 0);
      
      // Convert penalty length to ISO duration format
      const [penaltyMinutes, penaltySeconds] = formValue.penaltyLength.split(':').map((v: string) => parseInt(v, 10));
      const isoPenaltyLength = new Date();
      isoPenaltyLength.setHours(0, penaltyMinutes, penaltySeconds, 0);
      
      const penaltyRequest: PenaltyEventRequest = {
        game_id: this.gameId,
        event_name_id: this.penaltyEventId,
        team_id: formValue.team,
        player_id: formValue.player,
        period_id: formValue.period,
        time: isoTime.toISOString(),
        time_length: isoPenaltyLength.toISOString(),
        youtube_link: formValue.youtubeLink || undefined,
        ice_top_offset: this.puckLocation?.y as number | undefined,
        ice_left_offset: this.puckLocation?.x as number | undefined,
        zone: this.puckLocation?.zone
      };

      this.gameEventService.createPenaltyEvent(penaltyRequest).subscribe({
        next: (response) => {
          console.log('Penalty event created:', response);
          
          // Find selected team and player for display
          const selectedTeam = this.teamOptions.find(t => t.value === formValue.team);
          const selectedPlayer = this.playerOptions.find(p => p.value === formValue.player);
          
          const penaltyData: PenaltyFormData = {
            teamLogo: selectedTeam?.logo || '',
            teamName: selectedTeam?.label || '',
            playerName: selectedPlayer?.label || '',
            penaltyLength: formValue.penaltyLength,
            period: formValue.period.toString(),
            time: formValue.time,
            youtubeLink: formValue.youtubeLink,
            location: this.puckLocation || undefined
          };
          
          this.isSubmitting = false;
          this.dialogRef.close(penaltyData);
        },
        error: (error) => {
          console.error('Failed to create penalty event:', error);
          this.isSubmitting = false;
          // Optionally show error message to user
        }
      });
    } else if (!this.penaltyForm.valid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.penaltyForm.controls).forEach(key => {
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
      penaltyLength: 'Penalty Length',
      period: 'Period',
      time: 'Time',
      youtubeLink: 'YouTube Link',
      location: 'Location'
    };
    return labels[fieldName] || fieldName;
  }
}
