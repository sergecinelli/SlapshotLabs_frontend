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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Schedule, GameStatus } from '../../interfaces/schedule.interface';
import { Team } from '../../interfaces/team.interface';
import { Arena, Rink } from '../../interfaces/arena.interface';
import { Goalie } from '../../interfaces/goalie.interface';
import { TeamService } from '../../../services/team.service';
import { ArenaService } from '../../../services/arena.service';
import { GameMetadataService, GameTypeResponse, GamePeriodResponse } from '../../../services/game-metadata.service';
import { GoalieService } from '../../../services/goalie.service';
import { forkJoin } from 'rxjs';

export interface ScheduleFormModalData {
  schedule?: Schedule;
  isEditMode: boolean;
}

@Component({
  selector: 'app-schedule-form-modal',
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
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './schedule-form-modal.html',
  styleUrl: './schedule-form-modal.scss'
})
export class ScheduleFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<ScheduleFormModalComponent>>(MatDialogRef);
  private teamService = inject(TeamService);
  private arenaService = inject(ArenaService);
  private gameMetadataService = inject(GameMetadataService);
  private goalieService = inject(GoalieService);
  data = inject<ScheduleFormModalData>(MAT_DIALOG_DATA);

  scheduleForm: FormGroup;
  isEditMode: boolean;
  isLoading = true;

  teams: Team[] = [];
  arenas: Arena[] = [];
  rinks: Rink[] = [];
  goalies: Goalie[] = [];
  gameTypes: GameTypeResponse[] = [];
  gamePeriods: GamePeriodResponse[] = [];

  teamOptions: { value: string; label: string }[] = [];
  arenaOptions: { value: number; label: string }[] = [];
  rinkOptions: { value: number; label: string }[] = [];
  goalieOptions: { value: string; label: string }[] = [];
  awayGoalieOptions: { value: string; label: string }[] = [];
  homeGoalieOptions: { value: string; label: string }[] = [];
  gameTypeOptions: { value: number; label: string }[] = [];

  statusOptions = [
    { value: 0, label: 'Not Started' },
    { value: 1, label: 'Game in Progress' },
    { value: 2, label: 'Game Over' }
  ];

  constructor() {
    const data = this.data;
    this.isEditMode = data.isEditMode;
    this.scheduleForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadOptions();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      homeTeam: ['', [Validators.required]],
      homeGoals: [0, [Validators.min(0)]],
      homeTeamGoalie: [''],
      awayTeam: ['', [Validators.required]],
      awayGoals: [0, [Validators.min(0)]],
      awayTeamGoalie: [''],
      gameType: ['', [Validators.required]],
      tournamentName: [''],
      status: [0, [Validators.required]],
      date: ['', [Validators.required]],
      time: ['', [Validators.required, Validators.pattern(/^(1[0-2]|0?[1-9]):[0-5][0-9]\s*(AM|PM|am|pm)$/)]],
      arena: ['', [Validators.required]],
      rink: ['', [Validators.required]],
      gameTypeGroup: [''],
      homeFaceoffWin: [0, [Validators.min(0)]],
      awayFaceoffWin: [0, [Validators.min(0)]]
    });
  }

  /**
   * Load dropdown options from API
   */
  private loadOptions(): void {
    this.isLoading = true;

    forkJoin({
      teams: this.teamService.getTeams(),
      arenas: this.arenaService.getArenas(),
      rinks: this.arenaService.getAllRinks(),
      goalies: this.goalieService.getGoalies(),
      gameTypes: this.gameMetadataService.getGameTypes(),
      gamePeriods: this.gameMetadataService.getGamePeriods()
    }).subscribe({
      next: ({ teams, arenas, rinks, goalies, gameTypes, gamePeriods }) => {
        this.teams = teams.teams;
        this.arenas = arenas;
        this.rinks = rinks;
        this.goalies = goalies.goalies;
        this.gameTypes = gameTypes;
        this.gamePeriods = gamePeriods;

        this.teamOptions = this.transformTeamsToOptions(this.teams);
        this.arenaOptions = this.arenaService.transformArenasToOptions(this.arenas);
        this.goalieOptions = this.transformGoaliesToOptions(this.goalies);
        this.gameTypeOptions = this.gameMetadataService.transformGameTypesToOptions(this.gameTypes);

        // Set default values
        this.setDefaultValues();

        // If in edit mode, populate the form
        if (this.isEditMode && this.data.schedule) {
          this.populateForm(this.data.schedule);
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load options:', error);
        this.useFallbackOptions();
        this.setDefaultValues();

        if (this.isEditMode && this.data.schedule) {
          this.populateForm(this.data.schedule);
        }

        this.isLoading = false;
      }
    });
  }

  /**
   * Transform teams to dropdown options
   */
  private transformTeamsToOptions(teams: Team[]): { value: string; label: string }[] {
    return teams.map(team => ({
      value: team.id,
      label: `${team.name} (${team.group} - ${team.level})`
    }));
  }

  /**
   * Transform goalies to dropdown options
   */
  private transformGoaliesToOptions(goalies: Goalie[]): { value: string; label: string }[] {
    return goalies.map(goalie => ({
      value: goalie.id,
      label: `${goalie.firstName} ${goalie.lastName} (${goalie.team})`
    }));
  }

  /**
   * Set default values for form controls
   */
  private setDefaultValues(): void {
    if (!this.isEditMode) {
      const defaultValues: Record<string, string | number> = {
        status: 0,
        homeGoals: 0,
        awayGoals: 0,
        homeFaceoffWin: 0,
        awayFaceoffWin: 0
      };

      // Set default team values
      if (this.teamOptions.length > 0) {
        const awayTeamId = this.teamOptions[0].value;
        defaultValues['awayTeam'] = awayTeamId;
        // Set different team for home team if available
        const homeTeamId = this.teamOptions.length > 1 ? this.teamOptions[1].value : this.teamOptions[0].value;
        defaultValues['homeTeam'] = homeTeamId;
        
        // Filter goalies based on selected teams
        this.filterGoaliesByTeam(awayTeamId, 'away');
        this.filterGoaliesByTeam(homeTeamId, 'home');
        
        // Set default goalie values from filtered lists
        if (this.awayGoalieOptions.length > 0) {
          defaultValues['awayTeamGoalie'] = this.awayGoalieOptions[0].value;
        }
        if (this.homeGoalieOptions.length > 0) {
          defaultValues['homeTeamGoalie'] = this.homeGoalieOptions[0].value;
        }
      }
      
      // Set default game type
      if (this.gameTypeOptions.length > 0) {
        defaultValues['gameType'] = this.gameTypeOptions[0].value;
      }
      
      // Set default arena value
      if (this.arenaOptions.length > 0) {
        defaultValues['arena'] = this.arenaOptions[0].value;
        // Filter rinks based on first arena and set default rink
        this.filterRinksByArena(this.arenaOptions[0].value);
        if (this.rinkOptions.length > 0) {
          defaultValues['rink'] = this.rinkOptions[0].value;
        }
      }
      
      // Set default date and time (tomorrow at 7 PM)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(19, 0, 0, 0); // 7 PM
      defaultValues['date'] = tomorrow.toISOString().slice(0, 10);
      defaultValues['time'] = '7:00 PM';

      this.scheduleForm.patchValue(defaultValues);
    }

    this.scheduleForm.updateValueAndValidity();
  }

  /**
   * Use fallback options when API fails
   */
  private useFallbackOptions(): void {
    this.teamOptions = [
      { value: '1', label: 'Team A (1U - NHL)' },
      { value: '2', label: 'Team B (1U - NHL)' }
    ];

    this.goalieOptions = [
      { value: '1', label: 'Goalie A (Team A)' },
      { value: '2', label: 'Goalie B (Team B)' }
    ];

    this.arenaOptions = [
      { value: 1, label: 'Arena 1' },
      { value: 2, label: 'Arena 2' }
    ];

    this.gameTypeOptions = [
      { value: 1, label: 'Regular Season' },
      { value: 2, label: 'Playoff' }
    ];
  }

  private populateForm(schedule: Schedule): void {
    // Since schedule comes from the mapped API response,
    // we need to extract the IDs from the mapped strings
    // Team IDs are in format "Team {id}" due to TODO mapping
    const awayTeamId = this.extractIdFromString(schedule.awayTeam);
    const homeTeamId = this.extractIdFromString(schedule.homeTeam);
    const awayGoalieId = this.extractIdFromString(schedule.awayTeamGoalie);
    const homeGoalieId = this.extractIdFromString(schedule.homeTeamGoalie);
    const rinkId = this.extractIdFromString(schedule.rink);
    
    // Find the arena for this rink
    const rink = this.rinks.find(r => r.id === parseInt(rinkId));
    const arenaId = rink?.arena_id;
    
    if (arenaId) {
      this.filterRinksByArena(arenaId);
    }
    
    // Filter goalies based on selected teams
    if (awayTeamId) {
      this.filterGoaliesByTeam(awayTeamId, 'away');
    }
    if (homeTeamId) {
      this.filterGoaliesByTeam(homeTeamId, 'home');
    }
    
    this.scheduleForm.patchValue({
      awayTeam: awayTeamId,
      homeTeam: homeTeamId,
      homeGoals: schedule.homeGoals,
      awayGoals: schedule.awayGoals,
      awayTeamGoalie: awayGoalieId,
      homeTeamGoalie: homeGoalieId,
      date: schedule.date,
      time: this.convertTo12Hour(schedule.time),
      arena: arenaId,
      rink: rinkId,
      tournamentName: schedule.tournamentName || '',
      status: this.mapStatusToNumber(schedule.status)
    });
  }

  /**
   * Extract numeric ID from strings like "Team 123" or "Goalie 456" or "Rink 789"
   */
  private extractIdFromString(str: string): string {
    const match = str.match(/(\d+)/);
    return match ? match[1] : '';
  }

  /**
   * Map GameStatus enum to numeric status
   */
  private mapStatusToNumber(status: GameStatus): number {
    switch (status) {
      case GameStatus.NotStarted:
        return 0;
      case GameStatus.GameInProgress:
        return 1;
      case GameStatus.GameOver:
        return 2;
      default:
        return 0;
    }
  }

  onSubmit(): void {
    if (this.isLoading) {
      return;
    }

    if (this.scheduleForm.valid) {
      const formValue = this.scheduleForm.value;
      
      // Create API request body
      const gameData: Record<string, unknown> & { id?: number } = {
        home_team_id: parseInt(formValue.homeTeam),
        home_goals: formValue.homeGoals,
        home_team_goalie_id: parseInt(formValue.homeTeamGoalie),
        away_team_id: parseInt(formValue.awayTeam),
        away_goals: formValue.awayGoals,
        away_team_goalie_id: parseInt(formValue.awayTeamGoalie),
        game_type_id: formValue.gameType,
        tournament_name: formValue.tournamentName || '',
        status: formValue.status,
        date: formValue.date,
        time: this.convertTo24Hour(formValue.time),
        rink_id: formValue.rink,
        game_type_group: formValue.gameTypeGroup || '',
        home_faceoff_win: formValue.homeFaceoffWin,
        away_faceoff_win: formValue.awayFaceoffWin
      };

      // If edit mode, include the game ID
      if (this.isEditMode && this.data.schedule) {
        gameData.id = parseInt(this.data.schedule.id);
      }

      this.dialogRef.close(gameData);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.scheduleForm.controls).forEach(key => {
        this.scheduleForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.scheduleForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (control.errors['pattern']) {
        if (fieldName === 'time') {
          return 'Time must be in format h:mm AM/PM (e.g., 7:00 PM)';
        }
        return `${this.getFieldLabel(fieldName)} format is invalid`;
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      visitingTeam: 'Visiting Team',
      homeTeam: 'Home Team',
      awayTeam: 'Away Team',
      date: 'Date',
      time: 'Time',
      arena: 'Arena',
      rink: 'Rink',
      gameType: 'Game Type',
      status: 'Status'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Handle arena selection change and filter rinks
   */
  onArenaChange(arenaId: number): void {
    this.filterRinksByArena(arenaId);
    // Reset rink selection when arena changes
    this.scheduleForm.patchValue({ rink: '' });
  }

  /**
   * Filter goalies based on selected team
   */
  private filterGoaliesByTeam(teamId: string, teamType: 'away' | 'home'): void {
    const filteredGoalies = this.goalies.filter(goalie => {
      // Extract team name from goalie.team (format: "Team Name (Group - Level)")
      const team = this.teams.find(t => t.id === teamId);
      if (!team) return false;
      
      // Check if goalie's team matches the selected team
      return goalie.team === team.name || goalie.team.includes(team.name);
    });
    
    const options = this.transformGoaliesToOptions(filteredGoalies);
    
    if (teamType === 'away') {
      this.awayGoalieOptions = options;
    } else {
      this.homeGoalieOptions = options;
    }
  }

  /**
   * Handle away team selection change
   */
  onAwayTeamChange(teamId: string): void {
    this.filterGoaliesByTeam(teamId, 'away');
    // Reset away goalie selection
    if (this.awayGoalieOptions.length > 0) {
      this.scheduleForm.patchValue({ awayTeamGoalie: this.awayGoalieOptions[0].value });
    } else {
      this.scheduleForm.patchValue({ awayTeamGoalie: '' });
    }
  }

  /**
   * Handle home team selection change
   */
  onHomeTeamChange(teamId: string): void {
    this.filterGoaliesByTeam(teamId, 'home');
    // Reset home goalie selection
    if (this.homeGoalieOptions.length > 0) {
      this.scheduleForm.patchValue({ homeTeamGoalie: this.homeGoalieOptions[0].value });
    } else {
      this.scheduleForm.patchValue({ homeTeamGoalie: '' });
    }
  }

  /**
   * Select game type (radio button style)
   */
  selectGameType(value: number): void {
    this.scheduleForm.patchValue({ gameType: value });
    this.scheduleForm.get('gameType')?.markAsTouched();
  }

  /**
   * Select status (radio button style)
   */
  selectStatus(value: number): void {
    this.scheduleForm.patchValue({ status: value });
    this.scheduleForm.get('status')?.markAsTouched();
  }

  /**
   * Filter rinks based on selected arena
   */
  private filterRinksByArena(arenaId: number): void {
    const filteredRinks = this.rinks.filter(rink => rink.arena_id === arenaId);
    this.rinkOptions = this.arenaService.transformRinksToOptions(filteredRinks);
  }

  /**
   * Convert 24-hour time format to 12-hour AM/PM format
   * @param time24 Time in format HH:mm:ss or HH:mm
   * @returns Time in format h:mm AM/PM
   */
  private convertTo12Hour(time24: string): string {
    if (!time24) return '';
    
    const [hours24Str, minutes] = time24.split(':');
    const hours24 = parseInt(hours24Str);
    
    if (hours24 === 0) {
      return `12:${minutes} AM`;
    } else if (hours24 < 12) {
      return `${hours24}:${minutes} AM`;
    } else if (hours24 === 12) {
      return `12:${minutes} PM`;
    } else {
      return `${hours24 - 12}:${minutes} PM`;
    }
  }

  /**
   * Convert 12-hour AM/PM format to 24-hour format
   * @param time12 Time in format h:mm AM/PM
   * @returns Time in format HH:mm:ss
   */
  private convertTo24Hour(time12: string): string {
    if (!time12) return '';
    
    const timePattern = /(\d{1,2}):(\d{2})\s*(AM|PM)/i;
    const match = time12.match(timePattern);
    
    if (!match) {
      // If format is invalid, return as-is
      return time12;
    }
    
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();
    
    if (period === 'AM') {
      if (hours === 12) hours = 0;
    } else {
      if (hours !== 12) hours += 12;
    }
    
    const hours24 = hours.toString().padStart(2, '0');
    return `${hours24}:${minutes}:00`;
  }

  /**
   * Get form validity status for debugging
   */
  get isFormValid(): boolean {
    return this.scheduleForm.valid;
  }
}