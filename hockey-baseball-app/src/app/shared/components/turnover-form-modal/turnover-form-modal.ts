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
import { LocationSelectorComponent, PuckLocation, Team } from '../location-selector/location-selector';

interface PuckLocationWithCoords extends PuckLocation {
  top?: number;
  left?: number;
}
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
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule,
    LocationSelectorComponent
  ],
  templateUrl: './turnover-form-modal.html',
  styleUrl: './turnover-form-modal.scss'
})
export class TurnoverFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<TurnoverFormModalComponent>>(MatDialogRef);
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private gameMetadataService = inject(GameMetadataService);
  private gameEventService = inject(GameEventService);
  private dialogData = inject<{ gameId: number; turnoverEventId: number }>(MAT_DIALOG_DATA);

  gameId: number;
  turnoverEventId: number;

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
  }

  ngOnInit(): void {
    this.loadTeams();
    this.loadPeriods();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      team: ['', Validators.required],
      player: ['', Validators.required],
      period: ['', Validators.required],
      time: ['', [Validators.required, Validators.pattern(/^([0-5]?[0-9]):([0-5][0-9])$/)]],
      location: ['', Validators.required],
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
        if (this.teamOptions.length > 0) {
          this.turnoverForm.patchValue({ team: this.teamOptions[0].value });
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
          this.turnoverForm.patchValue({ period: this.periodOptions[0].value });
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
    this.playerService.getPlayersByTeam(teamId).subscribe({
      next: (players) => {
        this.playerOptions = players.map(player => ({
          value: parseInt(player.id),
          label: `${player.firstName} ${player.lastName}`
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
      }
    });
  }

  selectTeam(teamValue: number): void {
    this.turnoverForm.patchValue({ team: teamValue });
    this.turnoverForm.get('team')?.markAsTouched();
    // When team changes, update available players
    this.loadPlayersForTeam(teamValue);
  }

  selectPlayer(playerValue: number): void {
    this.turnoverForm.patchValue({ player: playerValue });
    this.turnoverForm.get('player')?.markAsTouched();
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
      
      // Convert time from mm:ss to ISO duration format (PT__M__S)
      const [minutes, seconds] = formValue.time.split(':').map((v: string) => parseInt(v, 10));
      const isoTime = new Date();
      isoTime.setHours(0, minutes, seconds, 0);
      
      const turnoverRequest: TurnoverEventRequest = {
        game_id: this.gameId,
        event_name_id: this.turnoverEventId,
        team_id: formValue.team,
        player_id: formValue.player,
        period_id: formValue.period,
        time: isoTime.toISOString(),
        youtube_link: formValue.youtubeLink || undefined,
        ice_top_offset: (this.puckLocation as PuckLocationWithCoords)?.top,
        ice_left_offset: (this.puckLocation as PuckLocationWithCoords)?.left,
        zone: this.puckLocation?.zone
      };

      this.gameEventService.createTurnoverEvent(turnoverRequest).subscribe({
        next: (response) => {
          console.log('Turnover event created:', response);
          
          // Find selected team and player for display
          const selectedTeam = this.teamOptions.find(t => t.value === formValue.team);
          const selectedPlayer = this.playerOptions.find(p => p.value === formValue.player);
          
          const turnoverData: TurnoverFormData = {
            teamLogo: selectedTeam?.logo || '',
            teamName: selectedTeam?.label || '',
            playerNames: [selectedPlayer?.label || ''],
            period: formValue.period.toString(),
            time: formValue.time,
            location: this.puckLocation || undefined,
            youtubeLink: formValue.youtubeLink
          };
          
          this.isSubmitting = false;
          this.dialogRef.close(turnoverData);
        },
        error: (error) => {
          console.error('Failed to create turnover event:', error);
          this.isSubmitting = false;
          // Optionally show error message to user
        }
      });
    } else if (!this.turnoverForm.valid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.turnoverForm.controls).forEach(key => {
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
        return 'Time must be in mm:ss format (e.g., 12:45)';
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
      youtubeLink: 'YouTube Link'
    };
    return labels[fieldName] || fieldName;
  }

  get selectedTeamData(): Team | undefined {
    const selectedTeamId = this.turnoverForm.get('team')?.value;
    if (!selectedTeamId) return undefined;
    
    const team = this.teamOptions.find(t => t.value === selectedTeamId);
    if (!team) return undefined;
    
    return {
      name: team.label,
      logo: `${environment.apiUrl}/hockey/team/${selectedTeamId}/logo`
    };
  }

  get otherTeamData(): Team | undefined {
    const selectedTeamId = this.turnoverForm.get('team')?.value;
    if (!selectedTeamId) return undefined;
    
    const otherTeam = this.teamOptions.find(t => t.value !== selectedTeamId);
    if (!otherTeam) return undefined;
    
    return {
      name: otherTeam.label,
      logo: `${environment.apiUrl}/hockey/team/${otherTeam.value}/logo`
    };
  }

  getTeamLogoUrl(teamId: number): string {
    return `${environment.apiUrl}/hockey/team/${teamId}/logo`;
  }
}
