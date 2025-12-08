import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from './button/button.component';
import { ButtonSmallComponent } from './button-small/button-small.component';
import { ButtonLinkComponent } from './button-link/button-link.component';
import { ButtonRouteComponent } from './button-route/button-route.component';
import { ButtonLoadingComponent } from './button-loading/button-loading.component';
import { ButtonDownloadComponent } from './button-download/button-download.component';
import { ButtonImageComponent } from './button-image/button-image.component';

const buttons = [
  ButtonComponent,
  ButtonSmallComponent,
  ButtonLinkComponent,
  ButtonRouteComponent,
  ButtonLoadingComponent,
  ButtonDownloadComponent,
  ButtonImageComponent,
];

@NgModule({
  imports: [
    CommonModule,
    MatRippleModule,
    RouterLink,
    MatTooltipModule,
    ...buttons,
  ],
  exports: buttons,
})
export class ButtonsModule { }