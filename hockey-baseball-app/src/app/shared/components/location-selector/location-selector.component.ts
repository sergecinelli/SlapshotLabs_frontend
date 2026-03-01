import { Component, forwardRef, ChangeDetectionStrategy, input, output, effect } from '@angular/core';

import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';

export interface PuckLocation {
  x: number; // 0-1000
  y: number; // 0-1000
  zone: 'defending' | 'neutral' | 'attacking';
}

export interface Team {
  name: string;
  logo?: string;
}

@Component({
  selector: 'app-location-selector',
  imports: [MatDividerModule],
  templateUrl: './location-selector.component.html',
  styleUrl: './location-selector.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LocationSelectorComponent),
      multi: true,
    },
  ],
})
export class LocationSelectorComponent implements ControlValueAccessor {
  showTitle = input(true);
  showDivider = input(true);
  title = input('Set Location');
  imageUrl = input('/assets/images/hockey-rink.svg');
  maxWidth = input('100%');
  showTeams = input(true);
  showClearButton = input(false);
  team1 = input<Team>();
  team2 = input<Team>();
  initialLocation = input<PuckLocation | null>(null);
  locationChange = output<PuckLocation | null>();

  puckLocation: PuckLocation | null = null;
  private onChange: (value: string) => void = () => {
    // Intentionally empty
  };
  private onTouched: () => void = () => {
    // Intentionally empty
  };

  private initialLocationEffect = effect(() => {
    const value = this.initialLocation();
    if (value && !(value.x === 0 && value.y === 0)) {
      this.puckLocation = value;
    }
  });

  onRinkClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const xCoord = Math.round((x / rect.width) * 1000);
    const yCoord = Math.round((y / rect.height) * 1000);

    const clampedX = Math.max(0, Math.min(1000, xCoord));
    const clampedY = Math.max(0, Math.min(1000, yCoord));

    let zone: 'defending' | 'neutral' | 'attacking';
    if (clampedX < 333) {
      zone = 'defending';
    } else if (clampedX < 666) {
      zone = 'neutral';
    } else {
      zone = 'attacking';
    }

    this.puckLocation = { x: clampedX, y: clampedY, zone };
    this.onChange(zone);
    this.onTouched();
    this.locationChange.emit(this.puckLocation);
  }

  onClearLocation(): void {
    this.puckLocation = null;
    this.onChange('');
    this.onTouched();
    this.locationChange.emit(null);
  }

  writeValue(value: string): void {
    if (!value) {
      this.puckLocation = null;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(): void {
    // Handle disabled state if needed
  }
}
