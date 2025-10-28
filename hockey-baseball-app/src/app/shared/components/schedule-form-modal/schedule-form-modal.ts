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
import { Schedule, GameType, GameStatus } from '../../interfaces/schedule.interface';
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
  filteredRinks: Rink[] = [];
  goalies: Goalie[] = [];
  gameTypes: GameTypeResponse[] = [];
  gamePeriods: GamePeriodResponse[] = [];

  teamOptions: { value: string; label: string }[] = [];
  arenaOptions: { value: number; label: string }[] = [];
  rinkOptions: { value: number; label: string }[] = [];
  goalieOptions: { value: string; label: string }[] = [];
  gameTypeOptions: { value: number; label: string }[] = [];
  gamePeriodOptions: { value: number; label: string }[] = [];

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
      time: ['', [Validators.required]],
      rink: ['', [Validators.required]],
      gamePeriod: [''],
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
        this.rinkOptions = this.arenaService.transformRinksToOptions(this.rinks);
        this.filteredRinks = this.rinks;
        this.goalieOptions = this.transformGoaliesToOptions(this.goalies);
        this.gameTypeOptions = this.gameMetadataService.transformGameTypesToOptions(this.gameTypes);
        this.gamePeriodOptions = this.gameMetadataService.transformGamePeriodsToOptions(this.gamePeriods);

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
        defaultValues['awayTeam'] = this.teamOptions[0].value;
        // Set different team for home team if available
        defaultValues['homeTeam'] = this.teamOptions.length > 1 ? this.teamOptions[1].value : this.teamOptions[0].value;
      }
      
      // Set default goalie values
      if (this.goalieOptions.length > 0) {
        defaultValues['homeTeamGoalie'] = this.goalieOptions[0].value;
        defaultValues['awayTeamGoalie'] = this.goalieOptions.length > 1 ? this.goalieOptions[1].value : this.goalieOptions[0].value;
      }
      
      // Set default game type
      if (this.gameTypeOptions.length > 0) {
        defaultValues['gameType'] = this.gameTypeOptions[0].value;
      }
      
      // Set default game period
      if (this.gamePeriodOptions.length > 0) {
        defaultValues['gamePeriod'] = this.gamePeriodOptions[0].value;
      }
      
      // Set default rink value
      if (this.rinkOptions.length > 0) {
        defaultValues['rink'] = this.rinkOptions[0].value;
      }
      
      // Set default date and time (tomorrow at 7 PM)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(19, 0, 0, 0); // 7 PM
      defaultValues['date'] = tomorrow.toISOString().slice(0, 10);
      defaultValues['time'] = '19:00:00';

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

    this.rinkOptions = [
      { value: 1, label: 'Rink 1' },
      { value: 2, label: 'Rink 2' }
    ];

    this.gameTypeOptions = [
      { value: 1, label: 'Regular Season' },
      { value: 2, label: 'Playoff' }
    ];

    this.gamePeriodOptions = [
      { value: 1, label: '1st Period' },
      { value: 2, label: '2nd Period' },
      { value: 3, label: '3rd Period' }
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
    
    this.scheduleForm.patchValue({
      awayTeam: awayTeamId,
      homeTeam: homeTeamId,
      homeGoals: schedule.homeGoals,
      awayGoals: schedule.awayGoals,
      awayTeamGoalie: awayGoalieId,
      homeTeamGoalie: homeGoalieId,
      date: schedule.date,
      time: schedule.time,
      rink: rinkId,
      tournamentName: schedule.tournamentName || '',
      status: this.mapStatusToNumber(schedule.status)
      // gameType and gamePeriod would need to be stored in the original data
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
      const gameData = {
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
        time: formValue.time,
        rink_id: formValue.rink,
        game_period_id: formValue.gamePeriod || null,
        game_type_group: formValue.gameTypeGroup || '',
        home_faceoff_win: formValue.homeFaceoffWin,
        away_faceoff_win: formValue.awayFaceoffWin
      };

      // If edit mode, include the game ID
      if (this.isEditMode && this.data.schedule) {
        (gameData as any).id = parseInt(this.data.schedule.id);
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
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      visitingTeam: 'Visiting Team',
      homeTeam: 'Home Team',
      startTime: 'Start Time',
      arena: 'Arena',
      rink: 'Rink',
      gameType: 'Game Type',
      status: 'Status'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Get form validity status for debugging
   */
  get isFormValid(): boolean {
    return this.scheduleForm.valid;
  }
}