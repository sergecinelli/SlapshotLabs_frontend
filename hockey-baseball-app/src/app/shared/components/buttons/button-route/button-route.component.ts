import { Component, input } from '@angular/core';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonBaseClass } from '../button-base.class';

@Component({
  selector: 'app-button-route',
  imports: [NgStyle, RouterLink, MatRippleModule, MatTooltipModule],
  templateUrl: './button-route.component.html',
  styleUrl: '../button.component.scss',
})
export class ButtonRouteComponent extends ButtonBaseClass {
  route = input('.');
  queryParams = input<Record<string, string | number> | null>(null);
  target = input<'_self' | '_blank' | '_parent' | '_top'>('_self');
}
