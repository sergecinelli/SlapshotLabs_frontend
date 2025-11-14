import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { DataTableComponent, TableColumn, TableAction } from '../../shared/components/data-table/data-table';
import { PlayerService } from '../../services/player.service';
import { TeamService } from '../../services/team.service';
import { Player } from '../../shared/interfaces/player.interface';
import { Team } from '../../shared/interfaces/team.interface';
import { PlayerFormModalComponent, PlayerFormModalData } from '../../shared/components/player-form-modal/player-form-modal';

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, DataTableComponent, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="p-6 pt-0">
      <app-page-header title="Players"></app-page-header>
      
      <!-- Add Player Button -->
      <div class="mb-4 flex justify-end">
        <button 
          mat-raised-button 
          color="primary" 
          (click)="openAddPlayerModal()"
          class="add-player-btn">
          <mat-icon>add</mat-icon>
          Add a Player
        </button>
      </div>
      
      <app-data-table
        [columns]="tableColumns"
        [data]="players()"
        [actions]="tableActions"
        [loading]="loading()"
        (actionClick)="onActionClick($event)"
        (sort)="onSort($event)"
        emptyMessage="No players found."
      ></app-data-table>
    </div>
  `,
  styleUrl: './players.scss'
})
export class PlayersComponent implements OnInit {
  private playerService = inject(PlayerService);
  private teamService = inject(TeamService);
  private dialog = inject(MatDialog);

  players = signal<Player[]>([]);
  teams: Team[] = [];
  loading = signal(true);

  tableColumns: TableColumn[] = [
    { key: 'team', label: 'Team', sortable: true, type: 'dropdown', width: '100px' },
    { key: 'position', label: 'Pos', sortable: true, type: 'dropdown', width: '100px' },
    { key: 'height', label: 'Ht', sortable: true, width: '65px' },
    { key: 'weight', label: 'Wt', sortable: true, type: 'number', width: '65px' },
    { key: 'shoots', label: 'Shoots (R/L)', sortable: true, type: 'dropdown', width: '100px' },
    { key: 'jerseyNumber', label: 'Jersey #', sortable: true, type: 'number', width: '70px' },
    { key: 'firstName', label: 'First Name', sortable: true, width: '100px' },
    { key: 'lastName', label: 'Last Name', sortable: true, width: '100px' },
    { key: 'birthYear', label: 'Birth Year', sortable: true, type: 'number', width: '90px' },
    { key: 'shotsOnGoal', label: 'SOG', sortable: true, type: 'number', width: '70px' },
    { key: 'gamesPlayed', label: 'GP', sortable: true, type: 'number', width: '60px' },
    { key: 'goals', label: 'Goals', sortable: true, type: 'number', width: '70px' },
    { key: 'assists', label: 'Assists', sortable: true, type: 'number', width: '75px' },
    { key: 'points', label: 'Pts', sortable: true, type: 'number', width: '60px' },
    { key: 'scoringChances', label: 'Scoring Chances', sortable: true, type: 'number', width: '120px' },
    { key: 'blockedShots', label: 'Blocked Shots', sortable: true, type: 'number', width: '110px' },
    { key: 'penaltiesDrawn', label: 'Penalties Drawn', sortable: true, type: 'number', width: '120px' }
  ];

  tableActions: TableAction[] = [
    { label: 'Delete', action: 'delete', variant: 'danger' },
    { label: 'Edit', action: 'edit', variant: 'secondary' },
    { label: 'Profile', action: 'view-profile', variant: 'primary' },
    { label: 'Spray Chart', icon: 'spray-chart', action: 'shot-spray-chart', variant: 'secondary', iconOnly: true },
  ];

  ngOnInit(): void {
    this.loadPlayers();
  }

  private loadPlayers(): void {
    this.loading.set(true);
    this.playerService.getPlayers().subscribe({
      next: (data) => {
        // Sort by creation date (newest to oldest) by default
        const sortedPlayers = this.sortByDate(data.players, 'desc');
        this.players.set(sortedPlayers);
        this.loading.set(false);
        // Fetch all teams separately for modals
        this.loadTeams();
      },
      error: (error) => {
        console.error('Error loading players:', error);
        this.loading.set(false);
      }
    });
  }

  private loadTeams(): void {
    this.teamService.getTeams().subscribe({
      next: (data) => {
        this.teams = data.teams;
      },
      error: (error) => {
        console.error('Error loading teams:', error);
      }
    });
  }

  onActionClick(event: { action: string, item: Player }): void {
    const { action, item } = event;
    
    switch (action) {
      case 'delete':
        this.deletePlayer(item);
        break;
      case 'edit':
        this.editPlayer(item);
        break;
      case 'view-profile':
        this.viewPlayerProfile(item);
        break;
      case 'shot-spray-chart':
        this.viewShotSprayChart(item);
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
  }

  onSort(event: { column: string, direction: 'asc' | 'desc' }): void {
    const { column, direction } = event;
    const sortedPlayers = [...this.players()].sort((a, b) => {
      const aValue = this.getNestedValue(a, column);
      const bValue = this.getNestedValue(b, column);
      
      if (aValue === bValue) return 0;
      
      const result = (aValue as string | number) < (bValue as string | number) ? -1 : 1;
      return direction === 'asc' ? result : -result;
    });
    
    this.players.set(sortedPlayers);
  }

  private getNestedValue(obj: Player, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => (current as Record<string, unknown>)?.[key], obj);
  }

  private sortByDate(players: Player[], direction: 'asc' | 'desc'): Player[] {
    return [...players].sort((a, b) => {
      const aDate = a.createdAt || new Date(0); // Use epoch if no date
      const bDate = b.createdAt || new Date(0);
      
      const result = aDate.getTime() - bDate.getTime();
      return direction === 'desc' ? -result : result; // desc = newest first
    });
  }

  private deletePlayer(player: Player): void {
    if (confirm(`Are you sure you want to delete ${player.firstName} ${player.lastName}?`)) {
      this.playerService.deletePlayer(player.id).subscribe({
        next: (success) => {
          if (success) {
            const updatedPlayers = this.players().filter(p => p.id !== player.id);
            this.players.set(updatedPlayers);
            // this.snackBar.open(
            //   `Player ${player.firstName} ${player.lastName} deleted successfully`,
            //   'Close',
            //   { duration: 3000, panelClass: ['custom-snackbar', 'success-snackbar'] }
            // );
          } else {
            // this.snackBar.open(
            //   'Failed to delete player. Please try again.',
            //   'Close',
            //   { duration: 3000, panelClass: ['custom-snackbar', 'error-snackbar'] }
            // );
          }
        },
        error: (error) => {
          console.error('Error deleting player:', error);
          // this.snackBar.open(
          //   'Error deleting player. Please try again.',
          //   'Close',
          //   { duration: 3000, panelClass: ['custom-snackbar', 'error-snackbar'] }
          // );
        }
      });
    }
  }

  private viewPlayerProfile(player: Player): void {
    // Build the full URL including the base URL
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/player-profile/${player.id}`;
    
    window.location.assign(url);
  }

  private viewShotSprayChart(player: Player): void {
    console.log('View shot spray chart for:', player);
    // TODO: Navigate to shot spray chart page
  }

  openAddPlayerModal(): void {
    const dialogRef = this.dialog.open(PlayerFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        isEditMode: false,
        teams: this.teams
      } as PlayerFormModalData,
      panelClass: 'player-form-modal-dialog',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.addPlayer(result);
      }
    });
  }

  private addPlayer(playerData: Partial<Player>): void {
    this.playerService.addPlayer(playerData).subscribe({
      next: (newPlayer) => {
        const currentPlayers = this.players();
        // Add new player at the beginning (newest first)
        const updatedPlayers = [newPlayer, ...currentPlayers];
        this.players.set(updatedPlayers);
        // this.snackBar.open(
        //   `Player ${newPlayer.firstName} ${newPlayer.lastName} added successfully`,
        //   'Close',
        //   { duration: 3000, panelClass: ['custom-snackbar', 'success-snackbar'] }
        // );
      },
      error: (error) => {
        console.error('Error adding player:', error);
      }
    });
  }

  private editPlayer(player: Player): void {
    const dialogRef = this.dialog.open(PlayerFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        player: player,
        isEditMode: true,
        teams: this.teams
      } as PlayerFormModalData,
      panelClass: 'player-form-modal-dialog',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updatePlayer(result);
      }
    });
  }

  private updatePlayer(playerData: Partial<Player>): void {
    this.playerService.updatePlayer(playerData.id!, playerData).subscribe({
      next: (updatedPlayer) => {
        const currentPlayers = this.players();
        const index = currentPlayers.findIndex(p => p.id === updatedPlayer.id);
        if (index !== -1) {
          const newPlayers = [...currentPlayers];
          newPlayers[index] = updatedPlayer;
          this.players.set(newPlayers);
          // this.snackBar.open(
          //   `Player ${updatedPlayer.firstName} ${updatedPlayer.lastName} updated successfully`,
          //   'Close',
          //   { duration: 3000, panelClass: ['custom-snackbar', 'success-snackbar'] }
          // );
        }
      },
      error: (error) => {
        console.error('Error updating player:', error);
      }
    });
  }
}
