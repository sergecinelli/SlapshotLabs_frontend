import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { LocationSelectorComponent, PuckLocation, Team } from '../location-selector/location-selector';

export interface NetLocation {
  x: number; // 0-1000
  y: number; // 0-1000
}

export interface ShotLocation {
  rinkLocation: PuckLocation;
  netLocation: NetLocation | null;
}

@Component({
  selector: 'app-shot-location-selector',
  standalone: true,
  imports: [CommonModule, MatDividerModule, LocationSelectorComponent],
  templateUrl: './shot-location-selector.html',
  styleUrl: './shot-location-selector.scss'
})
export class ShotLocationSelectorComponent {
  @Input() team1?: Team;
  @Input() team2?: Team;
  @Output() locationChange = new EventEmitter<ShotLocation | null>();

  rinkLocation: PuckLocation | null = null;
  netLocation: NetLocation | null = null;

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
        netLocation: this.netLocation
      });
    } else {
      this.locationChange.emit(null);
    }
  }

  get hasRinkLocation(): boolean {
    return this.rinkLocation !== null;
  }
}
