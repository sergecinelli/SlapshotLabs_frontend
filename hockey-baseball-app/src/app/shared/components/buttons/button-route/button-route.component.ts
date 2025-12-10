import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonBaseClass } from '../button-base.class';

@Component({
  selector: 'app-button-route',
  standalone: true,
  imports: [CommonModule, RouterLink, MatRippleModule, MatTooltipModule],
  templateUrl: './button-route.component.html',
  styleUrl: '../button.component.scss',
})
export class ButtonRouteComponent extends ButtonBaseClass {
  @Input() route = '.';
  @Input() queryParams: Record<string, string | number> | null = null;
  @Input() target: '_self' | '_blank' | '_parent' | '_top' = '_self';
}

