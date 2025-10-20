import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { ActionButtonComponent } from '../../shared/components/action-button/action-button';
import { ScheduleService } from '../../services/schedule.service';
import { Schedule, GameStatus } from '../../shared/interfaces/schedule.interface';
import { PlayerFormModalComponent, PlayerFormModalData } from '../../shared/components/player-form-modal/player-form-modal';
import { TeamFormModalComponent, TeamFormModalData } from '../../shared/components/team-form-modal/team-form-modal';
import { GoalieFormModalComponent, GoalieFormModalData } from '../../shared/components/goalie-form-modal/goalie-form-modal';
import { ScheduleFormModalComponent, ScheduleFormModalData } from '../../shared/components/schedule-form-modal/schedule-form-modal';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, ActionButtonComponent, MatDialogModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  private scheduleService = inject(ScheduleService);
  private dialog = inject(MatDialog);

  upcomingGames = signal<Schedule[]>([]);
  gameResults = signal<Schedule[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.loadGames();
  }

  private loadGames(): void {
    this.loading.set(true);
    this.scheduleService.getSchedules().subscribe({
      next: (data) => {
        // Filter upcoming games (not started) - exactly 5
        const upcoming = data.schedules
          .filter(game => game.status === GameStatus.NotStarted)
          .slice(0, 5);
        
        // Filter completed games (game over) - exactly 5  
        const completed = data.schedules
          .filter(game => game.status === GameStatus.GameOver)
          .slice(0, 5);
        
        this.upcomingGames.set(upcoming);
        this.gameResults.set(completed);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading games:', error);
        this.loading.set(false);
      }
    });
  }

  // Action button handlers
  openAddTeamModal(): void {
    const dialogRef = this.dialog.open(TeamFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: { isEditMode: false } as TeamFormModalData,
      panelClass: 'team-form-modal-dialog',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Team added successfully');
      }
    });
  }

  openAddPlayerModal(): void {
    const dialogRef = this.dialog.open(PlayerFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: { isEditMode: false } as PlayerFormModalData,
      panelClass: 'player-form-modal-dialog',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Player added successfully');
      }
    });
  }

  openAddGoalieModal(): void {
    const dialogRef = this.dialog.open(GoalieFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: { isEditMode: false } as GoalieFormModalData,
      panelClass: 'goalie-form-modal-dialog',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Goalie added successfully');
      }
    });
  }

  openAddGameModal(): void {
    const dialogRef = this.dialog.open(ScheduleFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: { isEditMode: false } as ScheduleFormModalData,
      panelClass: 'schedule-form-modal-dialog',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Game added successfully');
        this.loadGames(); // Refresh games list
      }
    });
  }

  createHighlightReel(): void {
    console.log('Create Highlight Reel clicked');
    // TODO: Implement highlight reel creation functionality
  }

  getTeamLogo(teamName: string): string {
    // TODO: Implement actual team logo logic
    // For now, return a placeholder or team initial
    return teamName.charAt(0).toUpperCase();
  }
}
