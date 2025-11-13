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
import { Player } from '../../interfaces/player.interface';
import { TeamService } from '../../../services/team.service';
import { ArenaService } from '../../../services/arena.service';
import { GameMetadataService, GameTypeResponse, GamePeriodResponse, GameTypeName } from '../../../services/game-metadata.service';
import { GoalieService } from '../../../services/goalie.service';
import { PlayerService } from '../../../services/player.service';
import { forkJoin } from 'rxjs';

export interface GameData {
  id: number;
  home_team_id: number;
  home_goals: number;
  home_start_goalie_id?: number;
  home_team_goalie_id?: number;
  away_team_id: number;
  away_goals: number;
  away_start_goalie_id?: number;
  away_team_goalie_id?: number;
  game_type_id: number;
  game_type_name?: string;
  status: number;
  date: string;
  time: string;
  season_id?: number;
  arena_id?: number;
  rink_id: number;
  game_period_id?: number;
  tournament_name?: string;
}

export interface ScheduleFormModalData {
  schedule?: Schedule;
  gameData?: GameData; // Raw API data for edit mode
  isEditMode: boolean;
  teams?: Team[];
  arenas?: Arena[];
  rinks?: Rink[];
  goalies?: Goalie[];
  players?: Player[];
  gameTypes?: GameTypeResponse[];
  gamePeriods?: GamePeriodResponse[];
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
  private playerService = inject(PlayerService);
  data = inject<ScheduleFormModalData>(MAT_DIALOG_DATA);

  scheduleForm: FormGroup;
  isEditMode: boolean;
  isLoading = true;

  teams: Team[] = [];
  arenas: Arena[] = [];
  rinks: Rink[] = [];
  goalies: Goalie[] = [];
  players: Player[] = [];
  gameTypes: GameTypeResponse[] = [];
  gamePeriods: GamePeriodResponse[] = [];

  teamOptions: { value: string; label: string }[] = [];
  arenaOptions: { value: number; label: string }[] = [];
  rinkOptions: { value: number; label: string }[] = [];
  goalieOptions: { value: string; label: string }[] = [];
  awayGoalieOptions: { value: string; label: string }[] = [];
  homeGoalieOptions: { value: string; label: string }[] = [];
  gameTypeOptions: { value: number; label: string }[] = [];
  gameTypeNameOptions: { value: number; label: string }[] = [];
  selectedGameType: GameTypeResponse | null = null;

  statusOptions = [
    { value: 1, label: 'Not Started' },
    { value: 2, label: 'Game in Progress' },
    { value: 3, label: 'Game Over' }
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
      status: [1, [Validators.required]],
      date: ['', [Validators.required]],
      time: ['', [Validators.required, Validators.pattern(/^(1[0-2]|0?[1-9]):[0-5][0-9]\s*(AM|PM|am|pm)$/)]],
      arena: ['', [Validators.required]],
      rink: ['', [Validators.required]],
      gameTypeGroup: [''],
      gameTypeName: [''],
      homeFaceoffWin: [0, [Validators.min(0)]],
      awayFaceoffWin: [0, [Validators.min(0)]]
    });
  }

  /**
   * Load dropdown options from API or use provided data
   */
  private loadOptions(): void {
    this.isLoading = true;

    // Check if data was provided from parent component
    if (this.data.teams && this.data.arenas && this.data.rinks && 
        this.data.goalies && this.data.players && this.data.gameTypes && this.data.gamePeriods) {
      // Use provided data
      this.teams = this.data.teams;
      this.arenas = this.data.arenas;
      this.rinks = this.data.rinks;
      this.goalies = this.data.goalies;
      this.players = this.data.players;
      this.gameTypes = this.data.gameTypes;
      this.gamePeriods = this.data.gamePeriods;

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
    } else {
      // Fetch from API if data not provided
      forkJoin({
        teams: this.teamService.getTeams(),
        arenas: this.arenaService.getArenas(),
        rinks: this.arenaService.getAllRinks(),
        goalies: this.goalieService.getGoalies(),
        players: this.playerService.getPlayers(),
        gameTypes: this.gameMetadataService.getGameTypes(),
        gamePeriods: this.gameMetadataService.getGamePeriods()
      }).subscribe({
        next: ({ teams, arenas, rinks, goalies, players, gameTypes, gamePeriods }) => {
          this.teams = teams.teams;
          this.arenas = arenas;
          this.rinks = rinks;
          this.goalies = goalies.goalies;
          this.players = players.players;
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
          this.setDefaultValues();

          if (this.isEditMode && this.data.schedule) {
            this.populateForm(this.data.schedule);
          }

          this.isLoading = false;
        }
      });
    }
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
        this.onGameTypeChange(this.gameTypeOptions[0].value);
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

  private populateForm(schedule: Schedule): void {
    // Use raw game data if available (preferred for edit mode)
    if (this.data.gameData) {
      const game = this.data.gameData;
      
      // Use home_start_goalie_id or home_team_goalie_id
      const homeGoalieId = game.home_start_goalie_id || game.home_team_goalie_id || 0;
      const awayGoalieId = game.away_start_goalie_id || game.away_team_goalie_id || 0;
      
      // Find the arena for this rink
      const rink = this.rinks.find(r => r.id === game.rink_id);
      const arenaId = rink?.arena_id;
      
      if (arenaId) {
        this.filterRinksByArena(arenaId);
      }
      
      // Filter goalies based on selected teams
      this.filterGoaliesByTeam(game.away_team_id.toString(), 'away');
      this.filterGoaliesByTeam(game.home_team_id.toString(), 'home');
      
      // Find the game type by matching game_type_name with game type names
      let gameTypeId = game.game_type_id;
      
      this.scheduleForm.patchValue({
        awayTeam: game.away_team_id.toString(),
        homeTeam: game.home_team_id.toString(),
        homeGoals: game.home_goals,
        awayGoals: game.away_goals,
        awayTeamGoalie: awayGoalieId > 0 ? awayGoalieId.toString() : '',
        homeTeamGoalie: homeGoalieId > 0 ? homeGoalieId.toString() : '',
        date: game.date,
        time: this.convertTo12Hour(game.time),
        arena: arenaId,
        rink: game.rink_id,
        tournamentName: game.tournament_name || '',
        status: game.status,
        gameType: gameTypeId
      });
      
      // Trigger game type change to populate game type names
      if (gameTypeId) {
        this.onGameTypeChange(gameTypeId);
      }
    } else {
      // Fallback: extract from mapped strings (less reliable)
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
    // GameStatus enum now directly represents API values (1, 2, 3)
    return status;
  }

  onSubmit(): void {
    if (this.isLoading) {
      return;
    }

    if (this.scheduleForm.valid) {
      const formValue = this.scheduleForm.value;
      
      const homeTeamId = parseInt(formValue.homeTeam);
      const awayTeamId = parseInt(formValue.awayTeam);
      
      // Get all goalies and players for home and away teams
      const homeGoalies = this.goalies
        .filter(g => g.teamId === homeTeamId)
        .map(g => parseInt(g.id));
      const awayGoalies = this.goalies
        .filter(g => g.teamId === awayTeamId)
        .map(g => parseInt(g.id));
      const homePlayers = this.players
        .filter(p => p.teamId === homeTeamId)
        .map(p => parseInt(p.id));
      const awayPlayers = this.players
        .filter(p => p.teamId === awayTeamId)
        .map(p => parseInt(p.id));
      
      // Get the game period with the lowest order (first period)
      const defaultGamePeriod = this.gamePeriods.length > 0
        ? this.gamePeriods.reduce((min, period) => (period as any).order < (min as any).order ? period : min)
        : null;
      
      const hasGameTypeName = !!formValue.gameTypeName;
      // Create API request body
      const gameData: Record<string, unknown> & { id?: number } = {
        home_team_id: homeTeamId,
        home_team_goalie_id: parseInt(formValue.homeTeamGoalie) || 0,
        away_team_id: awayTeamId,
        away_team_goalie_id: parseInt(formValue.awayTeamGoalie) || 0,
        game_type_id: formValue.gameType,
        ...(hasGameTypeName ? { game_type_name_id: parseInt(formValue.gameTypeName) } : {}),
        status: formValue.status,
        date: formValue.date,
        time: this.convertTo24Hour(formValue.time),
        rink_id: formValue.rink,
        home_goalies: homeGoalies,
        away_goalies: awayGoalies,
        home_players: homePlayers,
        away_players: awayPlayers,
        game_period_id: defaultGamePeriod ? defaultGamePeriod.id : 0
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
    const numericTeamId = parseInt(teamId, 10);
    
    const filteredGoalies = this.goalies.filter(goalie => {
      // Filter by teamId from API data
      return goalie.teamId === numericTeamId;
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
    this.onGameTypeChange(value);
  }
  
  /**
   * Handle game type change to update game type names
   */
  onGameTypeChange(gameTypeId: number): void {
    this.selectedGameType = this.gameTypes.find(gt => gt.id === gameTypeId) || null;
    
    if (this.selectedGameType && this.selectedGameType.game_type_names.length > 0) {
      this.gameTypeNameOptions = this.selectedGameType.game_type_names.map(name => ({
        value: name.id,
        label: name.name
      }));
      // Set first game type name as default
      this.scheduleForm.patchValue({ gameTypeName: this.gameTypeNameOptions[0].value });
    } else {
      this.gameTypeNameOptions = [];
      this.scheduleForm.patchValue({ gameTypeName: '' });
    }
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