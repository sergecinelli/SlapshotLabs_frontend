import { Injectable } from '@angular/core';
import { SprayChartEvent } from '../shared/interfaces/spray-chart.interface';
import { ShotLocationData } from '../shared/components/shot-location-display/shot-location-display';
import { GameEventName } from './game-event-name.service';
import { ShotTypeResponse } from './game-metadata.service';

@Injectable({
  providedIn: 'root'
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
    const eventNameMap = new Map(eventNames.map(e => [e.id, e.name]));
    const shotTypeMap = new Map(shotTypes.map(s => [s.id, s.name]));
    
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
        type
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
