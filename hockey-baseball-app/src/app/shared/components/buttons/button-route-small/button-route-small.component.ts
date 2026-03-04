import { Component, input } from '@angular/core';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonBaseClass } from '../button-base.class';

@Component({
  selector: 'app-button-route-small',
  imports: [NgStyle, RouterLink, MatTooltipModule],
  templateUrl: './button-route-small.component.html',
  styleUrl: '../button.component.scss',
})
export class ButtonRouteSmallComponent extends ButtonBaseClass {
  route = input('.');
  queryParams = input<Record<string, string | number> | null>(null);
}
