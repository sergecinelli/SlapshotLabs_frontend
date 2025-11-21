import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import {
  LocationSelectorComponent,
  PuckLocation,
  Team,
} from '../location-selector/location-selector';

export interface NetLocation {
  x: number; // 0-1000
  y: number; // 0-1000
}

export interface ShotLocation {
  rinkLocation: PuckLocation;
  netLocation?: NetLocation | null | undefined;
}

@Component({
  selector: 'app-shot-location-selector',
  standalone: true,
  imports: [CommonModule, MatDividerModule, LocationSelectorComponent],
  templateUrl: './shot-location-selector.html',
  styleUrl: './shot-location-selector.scss',
})
export class ShotLocationSelectorComponent {
  @Input() team1?: Team;
  @Input() team2?: Team;
  @Input() set initialLocation(value: ShotLocation | null) {
    if (value) {
      // Only set rink location if it's not (0,0)
      if (!(value.rinkLocation.x === 0 && value.rinkLocation.y === 0)) {
        this.rinkLocation = value.rinkLocation;
        this.initialRinkLocation = value.rinkLocation;
      }

      // Only set net location if it exists and is not (0,0)
      if (value.netLocation && !(value.netLocation.x === 0 && value.netLocation.y === 0)) {
        this.netLocation = value.netLocation;
        this.initialNetLocation = {
          x: value.netLocation.x,
          y: value.netLocation.y,
          zone: 'attacking', // dummy zone for net location
        };
      }
    }
  }
  @Output() locationChange = new EventEmitter<ShotLocation | null>();

  rinkLocation: PuckLocation | null = null;
  netLocation: NetLocation | null = null;
  initialRinkLocation: PuckLocation | null = null;
  initialNetLocation: PuckLocation | null = null;

  onRinkLocationChange(location: PuckLocation | null): void {
    this.rinkLocation = location;
    this.emitLocation();
  }

  onNetLocationChange(location: PuckLocation | null): void {
    // Extract only x and y coordinates for net location (ignore zone)
    this.netLocation = location ? { x: location.x, y: location.y } : null;
    this.emitLocation();
  }

  private emitLocation(): void {
    if (this.rinkLocation) {
      this.locationChange.emit({
        rinkLocation: this.rinkLocation,
        netLocation: this.netLocation,
      });
    } else {
      this.locationChange.emit(null);
    }
  }

  get hasRinkLocation(): boolean {
    return this.rinkLocation !== null;
  }
}
