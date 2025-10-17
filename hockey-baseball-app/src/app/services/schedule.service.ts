import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
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
    }
  ];

  getSchedules(): Observable<{ schedules: Schedule[] }> {
    return of({ schedules: this.mockSchedules }).pipe(delay(500));
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