import { Component, OnInit, signal, inject } from '@angular/core';
import {} from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { PlayerService } from '../../services/player.service';
import { TeamService } from '../../services/team.service';
import { Player } from '../../shared/interfaces/player.interface';
import { Team } from '../../shared/interfaces/team.interface';
import {
  PlayerFormModal,
  PlayerFormModalData,
} from '../../shared/components/player-form-modal/player-form.modal';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import { ButtonRouteComponent } from '../../shared/components/buttons/button-route/button-route.component';
import { visibilityByRoleMap } from './players.role-map';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
} from '../../shared/components/data-table/data-table.component';
import { LocalStorageService, StorageKey } from '../../services/local-storage.service';
import { TryoutService } from '../../services/tryout.service';
import { AuthService } from '../../services/auth.service';
import { CachedSrcDirective } from '../../shared/directives/cached-src.directive';
import { CardGridComponent } from '../../shared/components/card-grid/card-grid.component';

@Component({
  selector: 'app-players',
  imports: [
    CachedSrcDirective,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
    ComponentVisibilityByRoleDirective,
    ButtonComponent,
    ButtonRouteComponent,
    CardGridComponent,
    DataTableComponent,
  ],
  templateUrl: './players.page.html',
  styleUrl: './players.page.scss',
})
export class PlayersPage implements OnInit {
  // Role-based access map
  protected visibilityByRoleMap = visibilityByRoleMap;

  private playerService = inject(PlayerService);
  private teamService = inject(TeamService);
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private storage = inject(LocalStorageService);
  private tryoutService = inject(TryoutService);
  private authService = inject(AuthService);

  players = signal<Player[]>([]);
  teams: Team[] = [];
  loading = signal(true);
  teamId = signal<string | null>(null);
  teamName = signal<string>('Players');
  pageTitle = signal<string>('Players');
  layoutMode = signal<'card' | 'table'>('table'); // Default to table
  tableColumns: TableColumn[] = [
    { key: 'firstName', label: 'First Name', sortable: true, width: '120px' },
    { key: 'lastName', label: 'Last Name', sortable: true, width: '120px' },
    { key: 'jerseyNumber', label: '#', sortable: true, type: 'number', width: '50px' },
    { key: 'position', label: 'Position', sortable: true, width: '100px' },
    { key: 'team', label: 'Team', sortable: true, width: '150px' },
    { key: 'gamesPlayed', label: 'GP', sortable: true, type: 'number', width: '60px' },
    { key: 'goals', label: 'G', sortable: true, type: 'number', width: '60px' },
    { key: 'assists', label: 'A', sortable: true, type: 'number', width: '60px' },
    { key: 'points', label: 'PTS', sortable: true, type: 'number', width: '60px' },
    { key: 'shotsOnGoal', label: 'SOG', sortable: true, type: 'number', width: '60px' },
    { key: 'scoringChances', label: 'SC', sortable: true, type: 'number', width: '60px' },
    { key: 'blockedShots', label: 'BS', sortable: true, type: 'number', width: '60px' },
    { key: 'penaltiesDrawn', label: 'PD', sortable: true, type: 'number', width: '60px' },
  ];

  tableActions: TableAction[] = [
    { label: 'Analysis', action: 'analysis', variant: 'secondary', icon: 'analytics' },
    {
      label: 'Spray Chart',
      action: 'shot-spray-chart',
      variant: 'secondary',
      icon: 'scatter_plot',
      iconOnly: true,
    },
    {
      label: 'Add To Tryout',
      action: 'add-to-tryout',
      variant: 'secondary',
      icon: 'person_add',
      iconOnly: true,
    },
    {
      label: 'Profile',
      action: 'view-profile',
      variant: 'primary',
      icon: 'visibility',
      iconOnly: true,
      route: (item) => `/teams-and-rosters/players/${item['id']}/profile`,
    },
    {
      label: 'Edit',
      action: 'edit',
      variant: 'secondary',
      icon: 'stylus',
      iconOnly: true,
      roleVisibilityName: 'edit-action',
    },
    {
      label: 'Delete',
      action: 'delete',
      variant: 'danger',
      icon: 'delete',
      iconOnly: true,
      roleVisibilityName: 'delete-action',
    },
  ];

  ngOnInit(): void {
    // Initialize layout mode from local storage
    const savedMode = this.storage.get(StorageKey.LayoutMode);
    if (savedMode === 'card' || savedMode === 'table') {
      this.layoutMode.set(savedMode);
    }

    // Check for teamId query parameter
    this.route.queryParams.subscribe((params) => {
      const teamId = params['teamId'];
      const teamName = params['teamName'];

      if (teamId) {
        this.teamId.set(teamId);
        if (teamName) {
          this.teamName.set(teamName);
          this.pageTitle.set(`Players | ${teamName}`);
        }
        this.loadPlayersByTeam(parseInt(teamId, 10));
      } else {
        this.teamId.set(null);
        this.teamName.set('Players');
        this.pageTitle.set('Players');
        this.loadPlayers();
      }
    });
  }

  toggleLayout(): void {
    const newMode = this.layoutMode() === 'card' ? 'table' : 'card';
    this.layoutMode.set(newMode);
    this.storage.set(StorageKey.LayoutMode, newMode);
  }

  private loadPlayers(): void {
    this.loading.set(true);
    this.playerService.getPlayers().subscribe({
      next: (data) => {
        // Load teams first to get team data for mapping
        this.loadTeams(() => {
          // Map players with team information
          const mappedPlayers = data.players.map((player) => {
            if (player.teamId) {
              const team = this.teams.find((t) => parseInt(t.id) === player.teamId);
              if (team) {
                return {
                  ...player,
                  teamLogo: team.logo,
                  teamAgeGroup: team.group,
                  teamLevelName: team.level,
                };
              }
            }
            return player;
          });
          // Sort by creation date (newest to oldest) by default
          const sortedPlayers = this.sortByDate(mappedPlayers, 'desc');
          this.players.set(sortedPlayers);
          this.loading.set(false);
        });
      },
      error: (error) => {
        console.error('Error loading players:', error);
        this.loading.set(false);
      },
    });
  }

  private loadPlayersByTeam(teamId: number): void {
    this.loading.set(true);
    this.playerService.getPlayersByTeam(teamId).subscribe({
      next: (players) => {
        // Load teams first to get team data for mapping
        this.loadTeams(() => {
          // Map players with team information
          const mappedPlayers = players.map((player) => {
            if (player.teamId) {
              const team = this.teams.find((t) => parseInt(t.id) === player.teamId);
              if (team) {
                return {
                  ...player,
                  teamLogo: team.logo,
                  teamAgeGroup: team.group,
                  teamLevelName: team.level,
                };
              }
            }
            return player;
          });
          // Sort by creation date (newest to oldest) by default
          const sortedPlayers = this.sortByDate(mappedPlayers, 'desc');
          this.players.set(sortedPlayers);
          this.loading.set(false);
        });
      },
      error: (error) => {
        console.error('Error loading players for team:', error);
        this.loading.set(false);
      },
    });
  }

  private loadTeams(callback?: () => void): void {
    this.teamService.getTeams().subscribe({
      next: (data) => {
        this.teams = data.teams;
        if (callback) {
          callback();
        }
      },
      error: (error) => {
        console.error('Error loading teams:', error);
        if (callback) {
          callback();
        }
      },
    });
  }

  onActionClick(event: { action: string; item: Player }): void {
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
      case 'analysis':
        this.viewPlayerAnalysis(item);
        break;
      case 'add-to-tryout':
        this.addToTryout(item);
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
  }

  onSort(event: { column: string; direction: 'asc' | 'desc' }): void {
    const { column, direction } = event;
    const sortedPlayers = [...this.players()].sort((a, b) => {
      const aValue = this.getNestedValue(a, column);
      const bValue = this.getNestedValue(b, column);

      if (aValue === bValue) return 0;

      // Handle null/undefined
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const result = (aValue as string | number) < (bValue as string | number) ? -1 : 1;
      return direction === 'asc' ? result : -result;
    });

    this.players.set(sortedPlayers);
  }

  private getNestedValue(obj: Player, path: string): unknown {
    return path
      .split('.')
      .reduce((current: unknown, key: string) => (current as Record<string, unknown>)?.[key], obj);
  }

  private sortByDate(players: Player[], direction: 'asc' | 'desc'): Player[] {
    return [...players].sort((a, b) => {
      const aDate = a.createdAt || new Date(0); // Use epoch if no date
      const bDate = b.createdAt || new Date(0);

      const result = aDate.getTime() - bDate.getTime();
      return direction === 'desc' ? -result : result; // desc = newest first
    });
  }

  protected getPlayerInitials(player: Player): string {
    const first = player.firstName?.[0] || '';
    const last = player.lastName?.[0] || '';
    return (first + last).toUpperCase() || 'P';
  }

  deletePlayer(player: Player): void {
    if (confirm(`Are you sure you want to delete ${player.firstName} ${player.lastName}?`)) {
      this.playerService.deletePlayer(player.id).subscribe({
        next: (success) => {
          if (success) {
            const updatedPlayers = this.players().filter((p) => p.id !== player.id);
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
        },
      });
    }
  }

  viewPlayerProfile(player: Player): void {
    this.router.navigate(['/teams-and-rosters/players', player.id, 'profile']);
  }

  goToTeamProfile(teamId: number): void {
    this.router.navigate([`/teams-and-rosters/teams/${teamId}/profile`]);
  }

  viewShotSprayChart(player: Player): void {
    this.router.navigate(['/teams-and-rosters/players', player.id, 'spray-chart'], {
      queryParams: { type: 'player' },
    });
  }

  viewPlayerAnalysis(player: Player): void {
    this.router.navigate(['/analytics/players', player.id]);
  }

  openAddPlayerModal(): void {
    const dialogRef = this.dialog.open(PlayerFormModal, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        isEditMode: false,
        teams: this.teams,
        teamId: this.teamId(),
        teamName: this.teamName(),
      } as PlayerFormModalData,
      panelClass: 'player-form-modal-dialog',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
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
      },
    });
  }

  editPlayer(player: Player): void {
    const dialogRef = this.dialog.open(PlayerFormModal, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        player: player,
        isEditMode: true,
        teams: this.teams,
        teamId: this.teamId(),
        teamName: this.teamName(),
      } as PlayerFormModalData,
      panelClass: 'player-form-modal-dialog',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.updatePlayer(result);
      }
    });
  }

  addToTryout(player: Player): void {
    const user = this.authService.getCurrentUserValue();
    const teamId = user?.team_id;
    if (!teamId) return;

    this.tryoutService
      .addToTryout(teamId, {
        playerId: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        shoots: player.shoots,
        jerseyNumber: player.jerseyNumber,
        team: player.team,
        teamId: player.teamId,
        teamLogo: player.teamLogo,
        teamAgeGroup: player.teamAgeGroup,
        teamLevelName: player.teamLevelName || player.level,
        type: 'player',
      })
      .subscribe({
        error: (error) => console.error('Failed to add to tryout:', error),
      });
  }

  private updatePlayer(playerData: Partial<Player>): void {
    this.playerService.updatePlayer(playerData.id!, playerData).subscribe({
      next: (updatedPlayer) => {
        const currentPlayers = this.players();
        const index = currentPlayers.findIndex((p) => p.id === updatedPlayer.id);
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
      },
    });
  }
}
