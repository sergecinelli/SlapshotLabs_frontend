import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';

interface Team {
  name: string;
  logo: string;
  score: number;
  record: string;
  sog: number;
}

interface GameStats {
  faceoffWinPct: number;
  offensiveZoneEntry: {
    dump: number;
    carry: number;
    skated: number;
  };
  shots: {
    shotsOnGoal: number;
    missedNet: number;
    scoringChances: number;
    blocked: number;
  };
  turnovers: {
    offZone: number;
    neutralZone: number;
    defZone: number;
  };
}

interface GameEvent {
  id: number;
  period: string;
  time: string;
  team: string;
  event: string;
  player: string;
  description: string;
}

@Component({
  selector: 'app-live-dashboard',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './live-dashboard.html',
  styleUrl: './live-dashboard.scss'
})
export class LiveDashboardComponent {
  // Mock tournament data
  tournamentName = signal('LITE5');
  tournamentType = signal('U11B3');
  tournamentCategory = signal('Tournament');
  tournamentDate = signal('Apr 4, 2025, 4:35 PM');
  arenaInfo = signal('Earl Nicholas Arena - C');
  
  // Mock game data
  homeTeam = signal<Team>({
    name: 'BURLINGTON JR RAIDERS BLACK',
    logo: 'BRB',
    score: 2,
    record: '(0 - 1 - 0)',
    sog: 0
  });

  awayTeam = signal<Team>({
    name: 'WATERLOO WOLVES',
    logo: 'WW',
    score: 1,
    record: '(0 - 0 - 0)',
    sog: 0
  });

  period = signal('2ND Period');
  
  // Mock stats
  homeStats = signal<GameStats>({
    faceoffWinPct: 40,
    offensiveZoneEntry: {
      dump: 7,
      carry: 2,
      skated: 7
    },
    shots: {
      shotsOnGoal: 0,
      missedNet: 0,
      scoringChances: 0,
      blocked: 0
    },
    turnovers: {
      offZone: 0,
      neutralZone: 0,
      defZone: 0
    }
  });

  awayStats = signal<GameStats>({
    faceoffWinPct: 60,
    offensiveZoneEntry: {
      dump: 3,
      carry: 4,
      skated: 4
    },
    shots: {
      shotsOnGoal: 0,
      missedNet: 0,
      scoringChances: 0,
      blocked: 0
    },
    turnovers: {
      offZone: 0,
      neutralZone: 0,
      defZone: 0
    }
  });

  // Mock game events
  gameEvents = signal<GameEvent[]>([
    {
      id: 1,
      period: '1ST',
      time: '8:53',
      team: '[Logo] Name',
      event: 'GOAL (Short Handed Goal)',
      player: 'Joe Smith',
      description: 'Breakaway'
    },
    {
      id: 2,
      period: '',
      time: '3:53',
      team: '[Logo] Name',
      event: 'PENALTY (2 min, Elbowing)',
      player: 'Sam Harrison',
      description: 'Tripping Penalty'
    },
    {
      id: 3,
      period: '2ND',
      time: '8:53',
      team: '[Logo] Name',
      event: 'GOAL (Short Handed Goal)',
      player: 'Joe Smith',
      description: 'Breakaway'
    },
    {
      id: 4,
      period: '',
      time: '3:53',
      team: '[Logo] Name',
      event: 'PENALTY (2 min, Elbowing)',
      player: 'Sam Harrison',
      description: 'Tripping Penalty'
    },
    {
      id: 5,
      period: '',
      time: '8:53',
      team: '[Logo] Name',
      event: 'GOAL (Short Handed Goal)',
      player: 'Joe Smith',
      description: 'Breakaway'
    },
    {
      id: 6,
      period: '',
      time: '3:53',
      team: '[Logo] Name',
      event: 'PENALTY (2 min, Elbowing)',
      player: 'Sam Harrison',
      description: 'Tripping Penalty'
    }
  ]);

  // Turnover increment/decrement methods
  incrementTurnover(team: 'away' | 'home', zone: 'offZone' | 'neutralZone' | 'defZone'): void {
    if (team === 'away') {
      const currentStats = this.awayStats();
      this.awayStats.set({
        ...currentStats,
        turnovers: {
          ...currentStats.turnovers,
          [zone]: currentStats.turnovers[zone] + 1
        }
      });
    } else {
      const currentStats = this.homeStats();
      this.homeStats.set({
        ...currentStats,
        turnovers: {
          ...currentStats.turnovers,
          [zone]: currentStats.turnovers[zone] + 1
        }
      });
    }
  }

  decrementTurnover(team: 'away' | 'home', zone: 'offZone' | 'neutralZone' | 'defZone'): void {
    if (team === 'away') {
      const currentStats = this.awayStats();
      if (currentStats.turnovers[zone] > 0) {
        this.awayStats.set({
          ...currentStats,
          turnovers: {
            ...currentStats.turnovers,
            [zone]: currentStats.turnovers[zone] - 1
          }
        });
      }
    } else {
      const currentStats = this.homeStats();
      if (currentStats.turnovers[zone] > 0) {
        this.homeStats.set({
          ...currentStats,
          turnovers: {
            ...currentStats.turnovers,
            [zone]: currentStats.turnovers[zone] - 1
          }
        });
      }
    }
  }
}
