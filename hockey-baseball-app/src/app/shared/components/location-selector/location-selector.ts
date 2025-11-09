import { Component, Output, EventEmitter, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  standalone: true,
  imports: [CommonModule, MatDividerModule],
  templateUrl: './location-selector.html',
  styleUrl: './location-selector.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LocationSelectorComponent),
      multi: true
    }
  ]
})
export class LocationSelectorComponent implements ControlValueAccessor {
  @Input() showTitle = true;
  @Input() showDivider = true;
  @Input() title = 'Set Location';
  @Input() imageUrl = '/assets/images/hockey-rink.svg';
  @Input() maxWidth = '100%';
  @Input() showTeams = true;
  @Input() showClearButton = false;
  @Input() team1?: Team;
  @Input() team2?: Team;
  @Input() set initialLocation(value: PuckLocation | null) {
    if (value && !(value.x === 0 && value.y === 0)) {
      this.puckLocation = value;
    }
  }
  @Output() locationChange = new EventEmitter<PuckLocation | null>();

  puckLocation: PuckLocation | null = null;
  private onChange: (value: string) => void = () => {
    // Intentionally empty
  };
  private onTouched: () => void = () => {
    // Intentionally empty
  };

  onRinkClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Calculate positions from 0-1000
    const xCoord = Math.round((x / rect.width) * 1000);
    const yCoord = Math.round((y / rect.height) * 1000);
    
    // Clamp values to 0-1000 range
    const clampedX = Math.max(0, Math.min(1000, xCoord));
    const clampedY = Math.max(0, Math.min(1000, yCoord));
    
    // Determine zone based on x position
    // Defending zone: 0-333, Neutral zone: 333-666, Attacking zone: 666-1000
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

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    // If a zone value is written from the form, we don't set puckLocation
    // because we don't have x/y coordinates
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
