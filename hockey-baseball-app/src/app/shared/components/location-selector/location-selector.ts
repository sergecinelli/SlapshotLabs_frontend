import { Component, Output, EventEmitter, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';

export interface PuckLocation {
  x: number;
  y: number;
  zone: 'defending' | 'neutral' | 'attacking';
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
  @Input() showTitle: boolean = true;
  @Input() showDivider: boolean = true;
  @Output() locationChange = new EventEmitter<PuckLocation | null>();

  puckLocation: PuckLocation | null = null;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  onRinkClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Calculate percentage positions
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    // Determine zone based on x position
    // Defending zone: 0-33.33%, Neutral zone: 33.33-66.66%, Attacking zone: 66.66-100%
    let zone: 'defending' | 'neutral' | 'attacking';
    if (xPercent < 33.33) {
      zone = 'defending';
    } else if (xPercent < 66.66) {
      zone = 'neutral';
    } else {
      zone = 'attacking';
    }
    
    this.puckLocation = { x: xPercent, y: yPercent, zone };
    this.onChange(zone);
    this.onTouched();
    this.locationChange.emit(this.puckLocation);
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

  setDisabledState?(isDisabled: boolean): void {
    // Handle disabled state if needed
  }
}
