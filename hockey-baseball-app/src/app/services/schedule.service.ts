import { Injectable, inject } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { ApiService } from './api.service';
import { 
  Schedule, 
  GameType, 
  GameStatus, 
  GameEvent, 
  GameEventType, 
  GamePeriod 
} from '../shared/interfaces/schedule.interface';

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  private apiService = inject(ApiService);
  private mockSchedules: Schedule[] = [
    {
      id: '1',
      homeTeam: 'Lightning Bolts',
      homeGoals: 3,
      homeTeamGoalie: 'Mike Johnson',
      awayTeam: 'Ice Hawks',
      awayGoals: 2,
      awayTeamGoalie: 'Sarah Davis',
      gameType: GameType.RegularSeason,
      date: 'October 18, 2024',
      time: '7:30 PM',
      rink: 'Metro Ice Arena - Rink A',
      status: GameStatus.GameOver,
      events: [
        {
          id: '1',
          eventName: GameEventType.Goal,
          time: '05:23',
          period: GamePeriod.FirstPeriod,
          team: 'Lightning Bolts U16 A',
          playerName: 'Alex Thompson'
        },
        {
          id: '2',
          eventName: GameEventType.Goal,
          time: '12:45',
          period: GamePeriod.FirstPeriod,
          team: 'Ice Hawks U16 A',
          playerName: 'Jordan Smith'
        }
      ]
    },
    {
      id: '2',
      homeTeam: 'Storm Riders',
      homeGoals: 1,
      homeTeamGoalie: 'Emma Wilson',
      awayTeam: 'Fire Dragons',
      awayGoals: 2,
      awayTeamGoalie: 'Chris Martinez',
      gameType: GameType.Playoff,
      date: 'October 19, 2024',
      time: '2:00 PM',
      rink: 'City Ice Complex - Rink B',
      status: GameStatus.GameInProgress,
      events: [
        {
          id: '3',
          eventName: GameEventType.Goal,
          time: '08:12',
          period: GamePeriod.FirstPeriod,
          team: 'Fire Dragons U18 AA',
          playerName: 'Ryan Lee'
        },
        {
          id: '4',
          eventName: GameEventType.Assist,
          time: '08:12',
          period: GamePeriod.FirstPeriod,
          team: 'Fire Dragons U18 AA',
          playerName: 'Tyler Brown'
        }
      ]
    },
    {
      id: '3',
      homeTeam: 'Arctic Wolves',
      homeGoals: 0,
      homeTeamGoalie: 'David Kim',
      awayTeam: 'Thunder Cats',
      awayGoals: 0,
      awayTeamGoalie: 'Lisa Garcia',
      gameType: GameType.Tournament,
      tournamentName: 'Winter Championship',
      date: 'October 20, 2024',
      time: '10:00 AM',
      rink: 'Sports Center Ice - Main Rink',
      status: GameStatus.NotStarted,
      events: []
    },
    {
      id: '4',
      homeTeam: 'Blizzard Force',
      homeGoals: 4,
      homeTeamGoalie: 'Kevin Rodriguez',
      awayTeam: 'Frost Giants',
      awayGoals: 1,
      awayTeamGoalie: 'Amanda Taylor',
      gameType: GameType.Exhibition,
      date: 'October 17, 2024',
      time: '6:00 PM',
      rink: 'North Ice Facility - Rink C',
      status: GameStatus.GameOver,
      events: [
        {
          id: '5',
          eventName: GameEventType.Goal,
          time: '03:45',
          period: GamePeriod.FirstPeriod,
          team: 'Blizzard Force U14 A',
          playerName: 'Jake Peterson'
        },
        {
          id: '6',
          eventName: GameEventType.Goal,
          time: '15:20',
          period: GamePeriod.SecondPeriod,
          team: 'Blizzard Force U14 A',
          playerName: 'Mason Clark'
        },
        {
          id: '7',
          eventName: GameEventType.Penalty,
          time: '18:30',
          period: GamePeriod.SecondPeriod,
          team: 'Frost Giants U14 A',
          playerName: 'Noah White'
        }
      ]
    },
    {
      id: '5',
      homeTeam: 'Velocity Wings',
      homeGoals: 2,
      homeTeamGoalie: 'Rachel Green',
      awayTeam: 'Steel Sharks',
      awayGoals: 3,
      awayTeamGoalie: 'Mark Johnson',
      gameType: GameType.SummerLeague,
      date: 'October 21, 2024',
      time: '4:30 PM',
      rink: 'Ice Palace - Rink 1',
      status: GameStatus.GameInProgress,
      events: [
        {
          id: '8',
          eventName: GameEventType.Goal,
          time: '07:15',
          period: GamePeriod.FirstPeriod,
          team: 'Steel Sharks U16 B',
          playerName: 'Ethan Davis'
        },
        {
          id: '9',
          eventName: GameEventType.ShotOnGoal,
          time: '12:30',
          period: GamePeriod.FirstPeriod,
          team: 'Velocity Wings U16 B',
          playerName: 'Olivia Miller'
        }
      ]
    },
    {
      id: '6',
      homeTeam: 'Phoenix Rising',
      homeGoals: 0,
      homeTeamGoalie: 'Steven Adams',
      awayTeam: 'Glacier Knights',
      awayGoals: 0,
      awayTeamGoalie: 'Michelle Roberts',
      gameType: GameType.Tournament,
      tournamentName: 'Fall Classic',
      date: 'October 25, 2024',
      time: '11:30 AM',
      rink: 'Community Ice Center - Olympic Rink',
      status: GameStatus.NotStarted,
      events: []
    },
    // Additional upcoming games
    {
      id: '7',
      homeTeam: 'Thunder Hawks',
      homeGoals: 0,
      homeTeamGoalie: 'Jake Williams',
      awayTeam: 'Storm Eagles',
      awayGoals: 0,
      awayTeamGoalie: 'Sarah Chen',
      gameType: GameType.RegularSeason,
      date: 'October 26, 2024',
      time: '3:00 PM',
      rink: 'Metro Ice Arena - Rink B',
      status: GameStatus.NotStarted,
      events: []
    },
    {
      id: '8',
      homeTeam: 'Ice Titans',
      homeGoals: 0,
      homeTeamGoalie: 'Alex Rodriguez',
      awayTeam: 'Frost Wolves',
      awayGoals: 0,
      awayTeamGoalie: 'Emma Thompson',
      gameType: GameType.Playoff,
      date: 'October 27, 2024',
      time: '7:00 PM',
      rink: 'City Ice Complex - Rink A',
      status: GameStatus.NotStarted,
      events: []
    },
    {
      id: '9',
      homeTeam: 'Arctic Bears',
      homeGoals: 0,
      homeTeamGoalie: 'Mike Davis',
      awayTeam: 'Lightning Storm',
      awayGoals: 0,
      awayTeamGoalie: 'Lisa Park',
      gameType: GameType.Exhibition,
      date: 'October 28, 2024',
      time: '5:30 PM',
      rink: 'Sports Center Ice - Rink 2',
      status: GameStatus.NotStarted,
      events: []
    },
    {
      id: '10',
      homeTeam: 'Fire Hawks',
      homeGoals: 0,
      homeTeamGoalie: 'David Lee',
      awayTeam: 'Ice Dragons',
      awayGoals: 0,
      awayTeamGoalie: 'Rachel Martinez',
      gameType: GameType.Tournament,
      tournamentName: 'Winter Cup',
      date: 'October 29, 2024',
      time: '1:00 PM',
      rink: 'North Ice Facility - Main Rink',
      status: GameStatus.NotStarted,
      events: []
    },
    // Additional completed games
    {
      id: '11',
      homeTeam: 'Steel Wolves',
      homeGoals: 5,
      homeTeamGoalie: 'Chris Johnson',
      awayTeam: 'Thunder Cats',
      awayGoals: 2,
      awayTeamGoalie: 'Amanda Wilson',
      gameType: GameType.RegularSeason,
      date: 'October 15, 2024',
      time: '8:00 PM',
      rink: 'Ice Palace - Rink 2',
      status: GameStatus.GameOver,
      events: []
    },
    {
      id: '12',
      homeTeam: 'Frost Giants',
      homeGoals: 1,
      homeTeamGoalie: 'Kevin Brown',
      awayTeam: 'Storm Raiders',
      awayGoals: 3,
      awayTeamGoalie: 'Michelle Garcia',
      gameType: GameType.Playoff,
      date: 'October 14, 2024',
      time: '6:30 PM',
      rink: 'Community Ice Center - Rink A',
      status: GameStatus.GameOver,
      events: []
    },
    {
      id: '13',
      homeTeam: 'Ice Phoenix',
      homeGoals: 4,
      homeTeamGoalie: 'Tyler Adams',
      awayTeam: 'Arctic Storm',
      awayGoals: 4,
      awayTeamGoalie: 'Jessica Roberts',
      gameType: GameType.Exhibition,
      date: 'October 13, 2024',
      time: '2:30 PM',
      rink: 'Metro Ice Arena - Main Rink',
      status: GameStatus.GameOver,
      events: []
    }
  ];

  getSchedules(): Observable<{ schedules: Schedule[] }> {
    // Use mock data for now - will replace with API call
    return of({ schedules: this.mockSchedules }).pipe(delay(500));
  }

  getDashboardGames(): Observable<{ upcoming_games: { id: number; home_team_id: number; home_goals: number; home_start_goalie_id: number; away_team_id: number; away_goals: number; away_start_goalie_id: number; game_type_group: string; tournament_name?: string; date: string; time: string; rink_id: number; status: number }[]; previous_games: { id: number; home_team_id: number; home_goals: number; home_start_goalie_id: number; away_team_id: number; away_goals: number; away_start_goalie_id: number; game_type_group: string; tournament_name?: string; date: string; time: string; rink_id: number; status: number }[] }> {
    return this.apiService.get<{ upcoming_games: { id: number; home_team_id: number; home_goals: number; home_start_goalie_id: number; away_team_id: number; away_goals: number; away_start_goalie_id: number; game_type_group: string; tournament_name?: string; date: string; time: string; rink_id: number; status: number }[]; previous_games: { id: number; home_team_id: number; home_goals: number; home_start_goalie_id: number; away_team_id: number; away_goals: number; away_start_goalie_id: number; game_type_group: string; tournament_name?: string; date: string; time: string; rink_id: number; status: number }[] }>("/hockey/games-dashboard");
  }

  getGameList(): Observable<{ id: number; home_team_id: number; home_goals: number; home_start_goalie_id: number; away_team_id: number; away_goals: number; away_start_goalie_id: number; game_type_group: string; tournament_name?: string; date: string; time: string; rink_id: number; status: number }[]> {
    return this.apiService.get<{ id: number; home_team_id: number; home_goals: number; home_start_goalie_id: number; away_team_id: number; away_goals: number; away_start_goalie_id: number; game_type_group: string; tournament_name?: string; date: string; time: string; rink_id: number; status: number }[]>("/hockey/game/list");
  }

  createGame(gameData: Record<string, unknown>): Observable<{ id: number; success: boolean }> {
    return this.apiService.post<{ id: number; success: boolean }>('/hockey/game', gameData);
  }

  updateGame(gameId: number, gameData: Record<string, unknown>): Observable<{ success: boolean }> {
    return this.apiService.patch<{ success: boolean }>(`/hockey/game/${gameId}`, gameData);
  }

  deleteGame(gameId: number): Observable<{ success: boolean }> {
    return this.apiService.delete<{ success: boolean }>(`/hockey/game/${gameId}`);
  }

  getScheduleById(id: string): Observable<Schedule | null> {
    const schedule = this.mockSchedules.find(s => s.id === id);
    return of(schedule || null).pipe(delay(300));
  }

  addSchedule(scheduleData: Partial<Schedule>): Observable<Schedule> {
    const newSchedule: Schedule = {
      id: (this.mockSchedules.length + 1).toString(),
      homeTeam: scheduleData.homeTeam || '',
      homeGoals: scheduleData.homeGoals || 0,
      homeTeamGoalie: scheduleData.homeTeamGoalie || '',
      awayTeam: scheduleData.awayTeam || '',
      awayGoals: scheduleData.awayGoals || 0,
      awayTeamGoalie: scheduleData.awayTeamGoalie || '',
      gameType: scheduleData.gameType || GameType.RegularSeason,
      tournamentName: scheduleData.tournamentName,
      date: scheduleData.date || '',
      time: scheduleData.time || '',
      rink: scheduleData.rink || '',
      status: scheduleData.status || GameStatus.NotStarted,
      events: scheduleData.events || []
    };

    this.mockSchedules.push(newSchedule);
    return of(newSchedule).pipe(delay(500));
  }

  updateSchedule(id: string, scheduleData: Partial<Schedule>): Observable<Schedule> {
    const index = this.mockSchedules.findIndex(s => s.id === id);
    if (index !== -1) {
      this.mockSchedules[index] = { ...this.mockSchedules[index], ...scheduleData };
      return of(this.mockSchedules[index]).pipe(delay(500));
    }
    throw new Error('Schedule not found');
  }

  deleteSchedule(id: string): Observable<boolean> {
    const index = this.mockSchedules.findIndex(s => s.id === id);
    if (index !== -1) {
      this.mockSchedules.splice(index, 1);
      return of(true).pipe(delay(500));
    }
    return of(false).pipe(delay(500));
  }

  // Additional methods for live game functionality
  startGame(id: string): Observable<Schedule> {
    return this.updateSchedule(id, { status: GameStatus.GameInProgress });
  }

  endGame(id: string): Observable<Schedule> {
    return this.updateSchedule(id, { status: GameStatus.GameOver });
  }

  addGameEvent(scheduleId: string, event: Omit<GameEvent, 'id'>): Observable<Schedule> {
    const schedule = this.mockSchedules.find(s => s.id === scheduleId);
    if (schedule) {
      const newEvent: GameEvent = {
        ...event,
        id: (schedule.events.length + 1).toString()
      };
      schedule.events.push(newEvent);
      return of(schedule).pipe(delay(300));
    }
    throw new Error('Schedule not found');
  }
}