import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Schedule, GameStatus } from '../../interfaces/schedule.interface';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonRouteComponent } from '../buttons/button-route/button-route.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { getGameStatusLabel, isOvertimeStatus } from '../../constants/game-status.constants';

@Component({
  selector: 'app-game-card',
  imports: [
    RouterLink,
    MatIconModule,
    ButtonComponent,
    ButtonRouteComponent,
    ButtonLoadingComponent,
  ],
  templateUrl: './game-card.component.html',
  styleUrl: './game-card.component.scss',
})
export class GameCardComponent {
  game = input.required<Schedule>();
  showActions = input(false);
  showScore = input(true);
  isDeleting = input(false);
  edit = output<Schedule>();
  delete = output<Schedule>();

  protected readonly GameStatus = GameStatus;
  protected readonly getGameStatusLabel = getGameStatusLabel;
  protected readonly isOvertimeStatus = isOvertimeStatus;

  onEdit(): void {
    this.edit.emit(this.game());
  }

  onDelete(): void {
    this.delete.emit(this.game());
  }

  formatTimeTo12Hour(time: string | undefined): string {
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
    const g = this.game();
    if (g.arenaRink) {
      const parts = g.arenaRink.split(' – ');
      return parts[0] || g.arenaRink;
    }
    return g.arenaName || '';
  }

  getVenueLocation(): string {
    const g = this.game();
    if (g.arenaAddress) {
      const parts = g.arenaAddress.split(',');
      if (parts.length >= 2) {
        return parts.slice(-2).join(',').trim();
      }
      return g.arenaAddress;
    }
    return '';
  }

  getTeamLocation(isHome: boolean): string {
    const g = this.game();
    if (isHome) {
      if (g.homeTeamAgeGroup && g.homeTeamLevelName) {
        return `${g.homeTeamAgeGroup} ${g.homeTeamLevelName}`;
      }
      return g.homeTeamAgeGroup || g.homeTeamLevelName || '';
    } else {
      if (g.awayTeamAgeGroup && g.awayTeamLevelName) {
        return `${g.awayTeamAgeGroup} ${g.awayTeamLevelName}`;
      }
      return g.awayTeamAgeGroup || g.awayTeamLevelName || '';
    }
  }

  isWinning(isHome: boolean): boolean {
    const g = this.game();
    if (g.status !== GameStatus.GameOver) {
      return false;
    }
    if (isHome) {
      return g.homeGoals > g.awayGoals;
    } else {
      return g.awayGoals > g.homeGoals;
    }
  }
}
