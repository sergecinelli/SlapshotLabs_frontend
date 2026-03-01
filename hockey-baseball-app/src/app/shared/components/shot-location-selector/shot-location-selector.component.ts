import { Component, ChangeDetectionStrategy, input, output, effect } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import {
  LocationSelectorComponent,
  PuckLocation,
  Team,
} from '../location-selector/location-selector.component';

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
  imports: [MatDividerModule, LocationSelectorComponent],
  templateUrl: './shot-location-selector.component.html',
  styleUrl: './shot-location-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShotLocationSelectorComponent {
  team1 = input<Team>();
  team2 = input<Team>();
  initialLocation = input<ShotLocation | null>(null);
  locationChange = output<ShotLocation | null>();

  rinkLocation: PuckLocation | null = null;
  netLocation: NetLocation | null = null;
  initialRinkLocation: PuckLocation | null = null;
  initialNetLocation: PuckLocation | null = null;

  private initialLocationEffect = effect(() => {
    const value = this.initialLocation();
    if (value) {
      if (!(value.rinkLocation.x === 0 && value.rinkLocation.y === 0)) {
        this.rinkLocation = value.rinkLocation;
        this.initialRinkLocation = value.rinkLocation;
      }

      if (value.netLocation && !(value.netLocation.x === 0 && value.netLocation.y === 0)) {
        this.netLocation = value.netLocation;
        this.initialNetLocation = {
          x: value.netLocation.x,
          y: value.netLocation.y,
          zone: 'attacking',
        };
      }
    }
  });

  onRinkLocationChange(location: PuckLocation | null): void {
    this.rinkLocation = location;
    this.emitLocation();
  }

  onNetLocationChange(location: PuckLocation | null): void {
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
