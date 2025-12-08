import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { SelectionModel } from '@angular/cdk/collections';
import { GoalieService } from '../../../services/goalie.service';
import { PlayerService } from '../../../services/player.service';
import { forkJoin } from 'rxjs';

export interface RosterPlayer {
  id: number;
  jerseyNumber: number;
  firstName: string;
  lastName: string;
  position: string;
}

export interface RosterSelectionModalData {
  teamId: number;
  teamName: string;
  selectedGoalieIds?: number[];
  selectedPlayerIds?: number[];
}

export interface RosterSelectionResult {
  goalieIds: number[];
  playerIds: number[];
}

@Component({
  selector: 'app-roster-selection-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ButtonComponent,
    ButtonLoadingComponent,
    MatTableModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  templateUrl: './roster-selection-modal.html',
  styleUrl: './roster-selection-modal.scss',
})
export class RosterSelectionModalComponent implements OnInit {
  private dialogRef = inject<MatDialogRef<RosterSelectionModalComponent>>(MatDialogRef);
  private goalieService = inject(GoalieService);
  private playerService = inject(PlayerService);
  data = inject<RosterSelectionModalData>(MAT_DIALOG_DATA);

  isLoading = signal(true);
  goalies = signal<RosterPlayer[]>([]);
  players = signal<RosterPlayer[]>([]);

  displayedColumns = ['select', 'jerseyNumber', 'firstName', 'lastName'];

  goalieSelection = new SelectionModel<number>(true, []);
  playerSelection = new SelectionModel<number>(true, []);

  allGoalies = computed(() => this.goalies());
  allPlayers = computed(() => this.players());

  ngOnInit(): void {
    this.loadRoster();
  }

  private loadRoster(): void {
    this.isLoading.set(true);

    forkJoin({
      goalies: this.goalieService.getGoaliesByTeam(this.data.teamId, { excludeDefault: true }),
      players: this.playerService.getPlayersByTeam(this.data.teamId),
    }).subscribe({
      next: ({ goalies, players }) => {
        // Map goalies to roster format
        this.goalies.set(
          goalies.map((g) => ({
            id: parseInt(g.id),
            jerseyNumber: g.jerseyNumber,
            firstName: g.firstName,
            lastName: g.lastName,
            position: 'Goalie',
          }))
        );

        // Map players to roster format
        this.players.set(
          players.map((p) => ({
            id: parseInt(p.id),
            jerseyNumber: p.jerseyNumber,
            firstName: p.firstName,
            lastName: p.lastName,
            position: p.position,
          }))
        );

        // Select all by default
        this.goalieSelection.select(...this.goalies().map((g) => g.id));
        this.playerSelection.select(...this.players().map((p) => p.id));

        // If there are pre-selected IDs, use those instead
        if (this.data.selectedGoalieIds && this.data.selectedGoalieIds.length > 0) {
          this.goalieSelection.clear();
          this.goalieSelection.select(...this.data.selectedGoalieIds);
        }
        if (this.data.selectedPlayerIds && this.data.selectedPlayerIds.length > 0) {
          this.playerSelection.clear();
          this.playerSelection.select(...this.data.selectedPlayerIds);
        }

        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load roster:', error);
        this.isLoading.set(false);
      },
    });
  }

  isGoalieSelected(id: number): boolean {
    return this.goalieSelection.isSelected(id);
  }

  isPlayerSelected(id: number): boolean {
    return this.playerSelection.isSelected(id);
  }

  toggleGoalie(id: number): void {
    this.goalieSelection.toggle(id);
  }

  togglePlayer(id: number): void {
    this.playerSelection.toggle(id);
  }

  areAllGoaliesSelected(): boolean {
    const numGoalies = this.goalies().length;
    const numSelected = this.goalieSelection.selected.length;
    return numGoalies > 0 && numSelected === numGoalies;
  }

  areAllPlayersSelected(): boolean {
    const numPlayers = this.players().length;
    const numSelected = this.playerSelection.selected.length;
    return numPlayers > 0 && numSelected === numPlayers;
  }

  toggleAllGoalies(): void {
    if (this.areAllGoaliesSelected()) {
      this.goalieSelection.clear();
    } else {
      this.goalieSelection.select(...this.goalies().map((g) => g.id));
    }
  }

  toggleAllPlayers(): void {
    if (this.areAllPlayersSelected()) {
      this.playerSelection.clear();
    } else {
      this.playerSelection.select(...this.players().map((p) => p.id));
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    const result: RosterSelectionResult = {
      goalieIds: this.goalieSelection.selected,
      playerIds: this.playerSelection.selected,
    };
    this.dialogRef.close(result);
  }
}
