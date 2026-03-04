import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { TryoutEntry, TryoutTabType } from '../shared/interfaces/tryout.interface';

const MOCK_TRYOUT_PLAYERS: TryoutEntry[] = [
  {
    id: '1',
    playerId: '101',
    firstName: 'Connor',
    lastName: 'Smith',
    position: 'Center',
    shoots: 'L',
    jerseyNumber: 97,
    team: 'Edmonton Eagles',
    teamId: 10,
    teamAgeGroup: 'U18',
    teamLevelName: 'AAA',
    type: 'player',
  },
  {
    id: '2',
    playerId: '102',
    firstName: 'Jack',
    lastName: 'Miller',
    position: 'Left Wing',
    shoots: 'L',
    jerseyNumber: 13,
    team: 'Toronto Wolves',
    teamId: 11,
    teamAgeGroup: 'U16',
    teamLevelName: 'AA',
    type: 'player',
  },
  {
    id: '3',
    playerId: '103',
    firstName: 'Nathan',
    lastName: 'Johnson',
    position: 'Right Defense',
    shoots: 'R',
    jerseyNumber: 8,
    team: 'Calgary Storm',
    teamId: 12,
    teamAgeGroup: 'U18',
    teamLevelName: 'AAA',
    type: 'player',
  },
  {
    id: '4',
    playerId: '104',
    firstName: 'Tyler',
    lastName: 'Brown',
    position: 'Right Wing',
    shoots: 'R',
    jerseyNumber: 21,
    team: 'Vancouver Hawks',
    teamId: 13,
    teamAgeGroup: 'U16',
    teamLevelName: 'A',
    type: 'player',
  },
  {
    id: '5',
    playerId: '105',
    firstName: 'Brady',
    lastName: 'Wilson',
    position: 'Left Defense',
    shoots: 'L',
    jerseyNumber: 44,
    team: 'Ottawa Titans',
    teamId: 14,
    teamAgeGroup: 'U18',
    teamLevelName: 'AA',
    type: 'player',
  },
];

const MOCK_TRYOUT_GOALIES: TryoutEntry[] = [
  {
    id: '6',
    playerId: '201',
    firstName: 'Carey',
    lastName: 'Anderson',
    position: 'Goalie',
    shoots: 'L',
    jerseyNumber: 31,
    team: 'Montreal Vipers',
    teamId: 15,
    teamAgeGroup: 'U18',
    teamLevelName: 'AAA',
    type: 'goalie',
  },
  {
    id: '7',
    playerId: '202',
    firstName: 'Sergei',
    lastName: 'Petrov',
    position: 'Goalie',
    shoots: 'L',
    jerseyNumber: 35,
    team: 'Winnipeg Blaze',
    teamId: 16,
    teamAgeGroup: 'U16',
    teamLevelName: 'AA',
    type: 'goalie',
  },
  {
    id: '8',
    playerId: '203',
    firstName: 'Jake',
    lastName: 'Thompson',
    position: 'Goalie',
    shoots: 'R',
    jerseyNumber: 1,
    team: 'Calgary Storm',
    teamId: 12,
    teamAgeGroup: 'U18',
    teamLevelName: 'AAA',
    type: 'goalie',
  },
];

@Injectable({
  providedIn: 'root',
})
export class TryoutService {
  getTryoutEntries(teamId: number, type: TryoutTabType): Observable<TryoutEntry[]> {
    const data = type === 'player' ? MOCK_TRYOUT_PLAYERS : MOCK_TRYOUT_GOALIES;
    return of(data).pipe(delay(300));
  }

  addToTryout(teamId: number, entry: Partial<TryoutEntry>): Observable<TryoutEntry> {
    const newEntry: TryoutEntry = {
      id: String(Date.now()),
      playerId: entry.playerId || String(Date.now()),
      firstName: entry.firstName || '',
      lastName: entry.lastName || '',
      position: entry.position || '',
      shoots: entry.shoots || '',
      jerseyNumber: entry.jerseyNumber || 0,
      team: entry.team || '',
      teamId: entry.teamId,
      teamLogo: entry.teamLogo,
      teamAgeGroup: entry.teamAgeGroup,
      teamLevelName: entry.teamLevelName,
      type: entry.type || 'player',
    };
    return of(newEntry).pipe(delay(200));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeFromTryout(teamId: number, entryId: string): Observable<boolean> {
    return of(true).pipe(delay(200));
  }
}
