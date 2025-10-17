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
import { TeamService } from '../../../services/team.service';
import { ArenaService } from '../../../services/arena.service';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

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
  data = inject<ScheduleFormModalData>(MAT_DIALOG_DATA);

  scheduleForm: FormGroup;
  isEditMode: boolean;
  isLoading = true;

  teams: Team[] = [];
  arenas: Arena[] = [];
  rinks: Rink[] = [];
  filteredRinks: Rink[] = [];

  teamOptions: { value: string; label: string }[] = [];
  arenaOptions: { value: number; label: string }[] = [];
  rinkOptions: { value: number; label: string }[] = [];

  gameTypeOptions = [
    { value: GameType.RegularSeason, label: 'Regular Season' },
    { value: GameType.Playoff, label: 'Playoff' },
    { value: GameType.Tournament, label: 'Tournament' },
    { value: GameType.Exhibition, label: 'Exhibition' },
    { value: GameType.SummerLeague, label: 'Summer League' }
  ];

  statusOptions = [
    { value: GameStatus.NotStarted, label: 'Not Started' },
    { value: GameStatus.GameInProgress, label: 'Game in Progress' },
    { value: GameStatus.GameOver, label: 'Game Over' }
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
      visitingTeam: ['', [Validators.required]],
      homeTeam: ['', [Validators.required]],
      startTime: ['', [Validators.required]],
      arena: ['', [Validators.required]],
      rink: ['', [Validators.required]],
      gameType: [GameType.RegularSeason, [Validators.required]],
      status: [GameStatus.NotStarted, [Validators.required]]
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
      rinks: this.arenaService.getAllRinks()
    }).subscribe({
      next: ({ teams, arenas, rinks }) => {
        this.teams = teams.teams;
        this.arenas = arenas;
        this.rinks = rinks;

        this.teamOptions = this.transformTeamsToOptions(this.teams);
        this.arenaOptions = this.arenaService.transformArenasToOptions(this.arenas);
        this.rinkOptions = this.arenaService.transformRinksToOptions(this.rinks);
        this.filteredRinks = this.rinks;

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
   * Set default values for form controls
   */
  private setDefaultValues(): void {
    if (!this.isEditMode) {
      const defaultValues: any = {
        gameType: GameType.RegularSeason,
        status: GameStatus.NotStarted
      };

      // Set default team values
      if (this.teamOptions.length > 0) {
        defaultValues.visitingTeam = this.teamOptions[0].value;
        // Set different team for home team if available
        defaultValues.homeTeam = this.teamOptions.length > 1 ? this.teamOptions[1].value : this.teamOptions[0].value;
      }

      // Set default arena value
      if (this.arenaOptions.length > 0) {
        defaultValues.arena = this.arenaOptions[0].value;
        // Filter rinks for selected arena
        this.filteredRinks = this.rinks.filter(rink => rink.arena_id === this.arenaOptions[0].value);
        this.rinkOptions = this.arenaService.transformRinksToOptions(this.filteredRinks);
        
        if (this.rinkOptions.length > 0) {
          defaultValues.rink = this.rinkOptions[0].value;
        }
      }

      // Set default start time (tomorrow at 7 PM)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(19, 0, 0, 0); // 7 PM
      defaultValues.startTime = tomorrow.toISOString().slice(0, 16);

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

    this.arenaOptions = [
      { value: 1, label: 'Main Arena' },
      { value: 2, label: 'Practice Arena' }
    ];

    this.rinkOptions = [
      { value: 1, label: 'Rink 1' },
      { value: 2, label: 'Rink 2' }
    ];
  }

  /**
   * Handle arena selection change to filter rinks
   */
  onArenaChange(arenaId: number): void {
    this.filteredRinks = this.rinks.filter(rink => rink.arena_id === arenaId);
    this.rinkOptions = this.arenaService.transformRinksToOptions(this.filteredRinks);
    
    // Set first rink as default if available
    if (this.rinkOptions.length > 0) {
      this.scheduleForm.patchValue({ rink: this.rinkOptions[0].value });
    } else {
      this.scheduleForm.patchValue({ rink: '' });
    }
  }

  private populateForm(schedule: Schedule): void {
    // Parse date and time from schedule
    const dateTime = this.parseDateTime(schedule.date, schedule.time);
    
    // Find team IDs by name
    const visitingTeam = this.teams.find(t => t.name === schedule.awayTeam);
    const homeTeam = this.teams.find(t => t.name === schedule.homeTeam);
    
    this.scheduleForm.patchValue({
      visitingTeam: visitingTeam?.id || '',
      homeTeam: homeTeam?.id || '',
      startTime: dateTime,
      arena: this.extractArenaFromRink(schedule.rink),
      rink: this.extractRinkFromRink(schedule.rink),
      gameType: schedule.gameType,
      status: schedule.status
    });
  }

  /**
   * Parse date and time strings to datetime-local format
   */
  private parseDateTime(date: string, time: string): string {
    try {
      // Convert "Month Day, Year" and "HH:MM AM/PM" to ISO format
      const dateObj = new Date(`${date} ${time}`);
      return dateObj.toISOString().slice(0, 16); // Format for datetime-local input
    } catch (error) {
      console.error('Failed to parse date/time:', error);
      return '';
    }
  }

  /**
   * Extract arena ID from rink string format "<Facility Name> - <Rink Name>"
   */
  private extractArenaFromRink(rinkString: string): number | string {
    const arena = this.arenas.find(a => rinkString.startsWith(a.name));
    return arena ? arena.id : '';
  }

  /**
   * Extract rink ID from rink string format "<Facility Name> - <Rink Name>"
   */
  private extractRinkFromRink(rinkString: string): number | string {
    const rinkName = rinkString.split(' - ')[1];
    const rink = this.rinks.find(r => r.name === rinkName);
    return rink ? rink.id : '';
  }

  onSubmit(): void {
    if (this.isLoading) {
      return;
    }

    if (this.scheduleForm.valid) {
      const formValue = this.scheduleForm.value;
      
      // Convert datetime-local to separate date and time
      const startDateTime = new Date(formValue.startTime);
      const date = startDateTime.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const time = startDateTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });

      // Find arena and rink names
      const selectedArena = this.arenas.find(a => a.id === formValue.arena);
      const selectedRink = this.rinks.find(r => r.id === formValue.rink);
      const rinkString = `${selectedArena?.name || 'Unknown Arena'} - ${selectedRink?.name || 'Unknown Rink'}`;

      // Find team names
      const visitingTeam = this.teams.find(t => t.id === formValue.visitingTeam);
      const homeTeam = this.teams.find(t => t.id === formValue.homeTeam);

      const scheduleData: Partial<Schedule> = {
        awayTeam: visitingTeam?.name || 'Unknown Team',
        homeTeam: homeTeam?.name || 'Unknown Team',
        date: date,
        time: time,
        rink: rinkString,
        gameType: formValue.gameType,
        status: formValue.status,
        // Set default values for required fields
        homeGoals: 0,
        awayGoals: 0,
        homeTeamGoalie: '',
        awayTeamGoalie: '',
        events: []
      };

      if (this.isEditMode && this.data.schedule) {
        scheduleData.id = this.data.schedule.id;
      }

      this.dialogRef.close(scheduleData);
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