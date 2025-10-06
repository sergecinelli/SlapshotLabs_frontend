import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { Goalie } from '../../interfaces/goalie.interface';

export interface GoalieProfileModalData {
  goalie: Goalie;
}

@Component({
  selector: 'app-goalie-profile-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule
  ],
  templateUrl: './goalie-profile-modal.component.html',
  styleUrl: './goalie-profile-modal.component.scss'
})
export class GoalieProfileModalComponent {
  goalie: Goalie;

  constructor(
    private dialogRef: MatDialogRef<GoalieProfileModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GoalieProfileModalData
  ) {
    this.goalie = data.goalie;
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onEdit(): void {
    this.dialogRef.close({ action: 'edit', goalie: this.goalie });
  }

  calculateAge(): number {
    const currentYear = new Date().getFullYear();
    return currentYear - this.goalie.birthYear;
  }

  calculateSavePercentage(): string {
    if (this.goalie.shotsOnGoal === 0) return '0.00';
    const savePercentage = (this.goalie.saves / this.goalie.shotsOnGoal) * 100;
    return savePercentage.toFixed(2);
  }

  calculateGoalsAgainstAverage(): string {
    if (this.goalie.gamesPlayed === 0) return '0.00';
    const gaa = this.goalie.goalsAgainst / this.goalie.gamesPlayed;
    return gaa.toFixed(2);
  }

  calculateWinPercentage(): string {
    if (this.goalie.gamesPlayed === 0) return '0.00';
    const winPercentage = (this.goalie.wins / this.goalie.gamesPlayed) * 100;
    return winPercentage.toFixed(1);
  }

  formatLocation(): string {
    const { facilityName, rinkName, city } = this.goalie.rink;
    return `${facilityName} - ${rinkName}, ${city}`;
  }
}