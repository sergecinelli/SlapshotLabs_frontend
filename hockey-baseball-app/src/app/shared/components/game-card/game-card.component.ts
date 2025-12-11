import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Schedule, GameStatus } from '../../interfaces/schedule.interface';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonRouteComponent } from '../buttons/button-route/button-route.component';
import { getGameStatusLabel, isOvertimeStatus } from '../../constants/game-status.constants';

@Component({
  selector: 'app-game-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    ButtonComponent,
    ButtonRouteComponent,
  ],
  templateUrl: './game-card.component.html',
  styleUrl: './game-card.component.scss',
})
export class GameCardComponent {
  @Input({ required: true }) game!: Schedule;
  @Input() showActions = false;
  @Input() showScore = true; // Show score or "at" separator for upcoming games
  @Output() edit = new EventEmitter<Schedule>();
  @Output() delete = new EventEmitter<Schedule>();

  protected readonly GameStatus = GameStatus;
  protected readonly getGameStatusLabel = getGameStatusLabel;
  protected readonly isOvertimeStatus = isOvertimeStatus;

  onEdit(): void {
    this.edit.emit(this.game);
  }

  onDelete(): void {
    this.delete.emit(this.game);
  }

  formatTimeTo12Hour(time: string): string {
    if (!time) return '';

    const parts = time.split(':');
    if (parts.length < 2) return time;

    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];

    if (isNaN(hours)) return time;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${hours}:${minutes} ${ampm}`;
  }

  getVenueName(): string {
    if (this.game.arenaRink) {
      const parts = this.game.arenaRink.split(' – ');
      return parts[0] || this.game.arenaRink;
    }
    return this.game.arenaName || '';
  }

  getVenueLocation(): string {
    if (this.game.arenaAddress) {
      const parts = this.game.arenaAddress.split(',');
      if (parts.length >= 2) {
        return parts.slice(-2).join(',').trim();
      }
      return this.game.arenaAddress;
    }
    return '';
  }

  getTeamLocation(isHome: boolean): string {
    if (isHome) {
      if (this.game.homeTeamAgeGroup && this.game.homeTeamLevelName) {
        return `${this.game.homeTeamAgeGroup} ${this.game.homeTeamLevelName}`;
      }
      return this.game.homeTeamAgeGroup || this.game.homeTeamLevelName || '';
    } else {
      if (this.game.awayTeamAgeGroup && this.game.awayTeamLevelName) {
        return `${this.game.awayTeamAgeGroup} ${this.game.awayTeamLevelName}`;
      }
      return this.game.awayTeamAgeGroup || this.game.awayTeamLevelName || '';
    }
  }

  isWinning(isHome: boolean): boolean {
    if (this.game.status !== GameStatus.GameOver) {
      return false;
    }
    if (isHome) {
      return this.game.homeGoals > this.game.awayGoals;
    } else {
      return this.game.awayGoals > this.game.homeGoals;
    }
  }
}

