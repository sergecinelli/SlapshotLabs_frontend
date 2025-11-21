import { Injectable } from '@angular/core';
import { SprayChartEvent } from '../shared/interfaces/spray-chart.interface';
import { ShotLocationData } from '../shared/components/shot-location-display/shot-location-display';
import { GameEventName } from './game-event-name.service';
import { ShotTypeResponse } from './game-metadata.service';

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
    shotTypes: ShotTypeResponse[]
  ): ShotLocationData[] {
    // Create lookup maps for event names and shot types
    const eventNameMap = new Map(eventNames.map((e) => [e.id, e.name]));
    const shotTypeMap = new Map(shotTypes.map((s) => [s.id, s.name]));

    const results: ShotLocationData[] = [];

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

      results.push({
        iceTopOffset: this.convertCoordinateToPercentage(event.ice_top_offset),
        iceLeftOffset: this.convertCoordinateToPercentage(event.ice_left_offset),
        netTopOffset: this.convertCoordinateToPercentage(event.net_top_offset),
        netLeftOffset: this.convertCoordinateToPercentage(event.net_left_offset),
        type,
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
    shotTypes: ShotTypeResponse[]
  ): ShotLocationData[] {
    // Create lookup maps for event names and shot types
    const eventNameMap = new Map(eventNames.map((e) => [e.id, e.name]));
    const shotTypeMap = new Map(shotTypes.map((s) => [s.id, s.name]));

    const results: ShotLocationData[] = [];

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

      results.push({
        iceTopOffset: this.convertCoordinateToPercentage(event.ice_top_offset),
        iceLeftOffset: this.convertCoordinateToPercentage(event.ice_left_offset),
        netTopOffset: this.convertCoordinateToPercentage(event.net_top_offset),
        netLeftOffset: this.convertCoordinateToPercentage(event.net_left_offset),
        type,
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
    shotTypes: ShotTypeResponse[]
  ): ShotLocationData[] {
    // Create lookup maps for event names and shot types
    const eventNameMap = new Map(eventNames.map((e) => [e.id, e.name]));
    const shotTypeMap = new Map(shotTypes.map((s) => [s.id, s.name]));

    const results: ShotLocationData[] = [];

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

      results.push({
        iceTopOffset: this.convertCoordinateToPercentage(event.ice_top_offset),
        iceLeftOffset: this.convertCoordinateToPercentage(event.ice_left_offset),
        netTopOffset: this.convertCoordinateToPercentage(event.net_top_offset),
        netLeftOffset: this.convertCoordinateToPercentage(event.net_left_offset),
        type,
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
}
