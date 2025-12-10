import { Injectable } from '@angular/core';
import { SprayChartEvent } from '../shared/interfaces/spray-chart.interface';
import { ShotLocationData } from '../shared/components/shot-location-display/shot-location-display';
import { GameEventName } from './game-event-name.service';
import { ShotTypeResponse } from './game-metadata.service';

export interface SprayChartTransformOptions {
  indexMap?: Map<number, number>;
  teamNames?: Map<number, string>;
  playerNames?: Map<number, string>;
  goalieNames?: Map<number, string>;
  periodNames?: Map<number, string>;
  defaultTeamName?: string;
  defaultPlayerName?: string;
  formatTime?: (time: string) => string | undefined;
}

@Injectable({
  providedIn: 'root',
})
export class SprayChartUtilsService {
  /**
   * Transform spray chart events into shot location data for display
   */
  transformSprayChartData(
    events: SprayChartEvent[],
    eventNames: GameEventName[],
    shotTypes: ShotTypeResponse[],
    options?: SprayChartTransformOptions
  ): ShotLocationData[] {
    // Create lookup maps for event names and shot types
    const eventNameMap = new Map(eventNames.map((e) => [e.id, e.name]));
    const shotTypeMap = new Map(shotTypes.map((s) => [s.id, s.name]));

    const results: ShotLocationData[] = [];
    let fallbackIndex = 0;

    for (const event of events) {
      const eventName = eventNameMap.get(event.event_name_id);
      const shotTypeName = shotTypeMap.get(event.shot_type_id);

      // Only process "Shot on Goal" events
      if (eventName !== 'Shot on Goal') {
        continue;
      }

      // Determine if it's a Goal or Save based on shot type
      let type: 'Goal' | 'Save' | null = null;
      if (shotTypeName === 'Goal') {
        type = 'Goal';
      } else if (shotTypeName === 'Save') {
        type = 'Save';
      }

      // Skip if not Goal or Save
      if (!type) {
        continue;
      }

      const index = this.resolveIndex(event, options, fallbackIndex++);
      const teamName = options?.teamNames?.get(event.team_id) ?? options?.defaultTeamName;
      const playerName =
        options?.playerNames?.get(event.player_id) ??
        options?.goalieNames?.get(event.goalie_id) ??
        options?.defaultPlayerName;
      const description = event.note || event.goal_type || '';
      const periodLabel =
        options?.periodNames?.get(event.period_id) ?? (event.period_id ? `Period ${event.period_id}` : undefined);
      const timeLabel = options?.formatTime ? options.formatTime(event.time) : event.time;

      results.push({
        index,
        eventId: event.id,
        eventTypeLabel: type,
        playerName,
        teamName,
        timeLabel,
        periodLabel,
        description,
        iceTopOffset: this.convertCoordinateToPercentage(event.ice_top_offset),
        iceLeftOffset: this.convertCoordinateToPercentage(event.ice_left_offset),
        netTopOffset: this.convertCoordinateToPercentage(event.net_top_offset),
        netLeftOffset: this.convertCoordinateToPercentage(event.net_left_offset),
        type,
        tooltip: this.buildTooltip({
          index,
          typeLabel: type,
          playerName,
          teamName,
          timeLabel,
          periodLabel,
          description,
        }),
      });
    }

    return results;
  }

  /**
   * Transform spray chart events for player profile (different categories than goalie)
   */
  transformPlayerSprayChartData(
    events: SprayChartEvent[],
    eventNames: GameEventName[],
    shotTypes: ShotTypeResponse[],
    options?: SprayChartTransformOptions
  ): ShotLocationData[] {
    // Create lookup maps for event names and shot types
    const eventNameMap = new Map(eventNames.map((e) => [e.id, e.name]));
    const shotTypeMap = new Map(shotTypes.map((s) => [s.id, s.name]));

    const results: ShotLocationData[] = [];
    let fallbackIndex = 0;

    for (const event of events) {
      const eventName = eventNameMap.get(event.event_name_id);
      const shotTypeName = shotTypeMap.get(event.shot_type_id);

      let type: ShotLocationData['type'] | null = null;

      // Handle Penalty events
      if (eventName === 'Penalty') {
        type = 'Penalty';
      }
      // Handle Turnover events
      else if (eventName === 'Turnover') {
        type = 'Turnover';
      }
      // Handle Shot on Goal events
      else if (eventName === 'Shot on Goal') {
        // Check if it's a scoring chance
        if (event.is_scoring_chance) {
          type = 'Scoring Chance';
        }
        // Check shot type for Goals, Blocks, Misses
        else if (shotTypeName === 'Goal') {
          // Check if it's PP or SH goal
          if (event.goal_type === 'Power Play') {
            type = 'PP Goal';
          } else if (event.goal_type === 'Short Handed') {
            type = 'SH Goal';
          } else {
            type = 'Goal';
          }
        } else if (shotTypeName === 'Blocked') {
          type = 'Blocked';
        } else if (shotTypeName === 'Missed the net') {
          type = 'Missed';
        }
      }

      // Skip if no valid type was determined
      if (!type) {
        continue;
      }

      const index = this.resolveIndex(event, options, fallbackIndex++);
      const teamName = options?.teamNames?.get(event.team_id) ?? options?.defaultTeamName;
      const playerName =
        options?.playerNames?.get(event.player_id) ??
        options?.goalieNames?.get(event.goalie_id) ??
        options?.defaultPlayerName;
      const description = event.note || event.goal_type || '';
      const periodLabel =
        options?.periodNames?.get(event.period_id) ?? (event.period_id ? `Period ${event.period_id}` : undefined);
      const timeLabel = options?.formatTime ? options.formatTime(event.time) : event.time;

      results.push({
        index,
        eventId: event.id,
        eventTypeLabel: type,
        playerName,
        teamName,
        timeLabel,
        periodLabel,
        description,
        iceTopOffset: this.convertCoordinateToPercentage(event.ice_top_offset),
        iceLeftOffset: this.convertCoordinateToPercentage(event.ice_left_offset),
        netTopOffset: this.convertCoordinateToPercentage(event.net_top_offset),
        netLeftOffset: this.convertCoordinateToPercentage(event.net_left_offset),
        type,
        tooltip: this.buildTooltip({
          index,
          typeLabel: type,
          playerName,
          teamName,
          timeLabel,
          periodLabel,
          description,
        }),
      });
    }

    return results;
  }

  /**
   * Transform spray chart events for game view (combines player and goalie categories)
   */
  transformGameSprayChartData(
    events: SprayChartEvent[],
    eventNames: GameEventName[],
    shotTypes: ShotTypeResponse[],
    options?: SprayChartTransformOptions
  ): ShotLocationData[] {
    // Create lookup maps for event names and shot types
    const eventNameMap = new Map(eventNames.map((e) => [e.id, e.name]));
    const shotTypeMap = new Map(shotTypes.map((s) => [s.id, s.name]));

    const results: ShotLocationData[] = [];
    let fallbackIndex = 0;

    for (const event of events) {
      const eventName = eventNameMap.get(event.event_name_id);
      const shotTypeName = shotTypeMap.get(event.shot_type_id);

      let type: ShotLocationData['type'] | null = null;

      // Handle Faceoff events
      if (eventName === 'Faceoff') {
        type = 'Faceoff';
      }
      // Handle Penalty events
      else if (eventName === 'Penalty') {
        type = 'Penalty';
      }
      // Handle Turnover events
      else if (eventName === 'Turnover') {
        type = 'Turnover';
      }
      // Handle Shot on Goal events
      else if (eventName === 'Shot on Goal') {
        // Check if it's a scoring chance
        if (event.is_scoring_chance) {
          type = 'Scoring Chance';
        }
        // Check shot type for Goals, Blocks, Misses, Saves
        else if (shotTypeName === 'Goal') {
          // Check if it's PP or SH goal
          if (event.goal_type === 'Power Play') {
            type = 'PP Goal';
          } else if (event.goal_type === 'Short Handed') {
            type = 'SH Goal';
          } else {
            type = 'Goal';
          }
        } else if (shotTypeName === 'Save') {
          type = 'Save';
        } else if (shotTypeName === 'Blocked') {
          type = 'Blocked';
        } else if (shotTypeName === 'Missed the net') {
          type = 'Missed';
        }
      }

      // Skip if no valid type was determined
      if (!type) {
        continue;
      }

      const index = this.resolveIndex(event, options, fallbackIndex++);
      const teamName = options?.teamNames?.get(event.team_id) ?? options?.defaultTeamName;
      const playerName =
        options?.playerNames?.get(event.player_id) ??
        options?.goalieNames?.get(event.goalie_id) ??
        options?.defaultPlayerName;
      const periodLabel =
        options?.periodNames?.get(event.period_id) ?? (event.period_id ? `Period ${event.period_id}` : undefined);
      const timeLabel = options?.formatTime ? options.formatTime(event.time) : event.time;

      results.push({
        index,
        eventId: event.id,
        eventTypeLabel: type,
        playerName,
        teamName,
        timeLabel,
        periodLabel,
        description: event.note || event.goal_type || '',
        iceTopOffset: this.convertCoordinateToPercentage(event.ice_top_offset),
        iceLeftOffset: this.convertCoordinateToPercentage(event.ice_left_offset),
        netTopOffset: this.convertCoordinateToPercentage(event.net_top_offset),
        netLeftOffset: this.convertCoordinateToPercentage(event.net_left_offset),
        type,
        tooltip: this.buildTooltip({
          index,
          typeLabel: type,
          playerName,
          teamName,
          timeLabel,
          periodLabel,
          description: event.note || event.goal_type || '',
        }),
      });
    }

    return results;
  }

  /**
   * Convert API coordinate (0-1000 scale) to percentage (0-100)
   */
  private convertCoordinateToPercentage(coordinate: number): number {
    return (coordinate / 1000) * 100;
  }

  private resolveIndex(
    event: SprayChartEvent,
    options: SprayChartTransformOptions | undefined,
    fallbackIndex: number
  ): number {
    const existing = options?.indexMap?.get(event.id);
    if (existing) {
      return existing;
    }
    return fallbackIndex + 1;
  }

  private buildTooltip(args: {
    index: number;
    typeLabel: string;
    playerName?: string;
    teamName?: string;
    timeLabel?: string;
    periodLabel?: string;
    description?: string;
  }): string {
    const lines = [`#${args.index} — ${args.typeLabel}`];
    if (args.playerName) {
      lines.push(`Player: ${args.playerName}`);
    }
    if (args.teamName) {
      lines.push(`Team: ${args.teamName}`);
    }
    if (args.timeLabel) {
      lines.push(`Time: ${args.timeLabel}`);
    }
    if (args.periodLabel) {
      lines.push(`Period: ${args.periodLabel}`);
    }
    if (args.description) {
      lines.push(args.description);
    }
    return lines.join('\n');
  }
}
