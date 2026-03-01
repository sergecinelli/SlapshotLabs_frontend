import { Component , ChangeDetectionStrategy } from '@angular/core';
import {  } from '@angular/common';

@Component({
  selector: 'app-banner-skeleton',
  imports: [],
  templateUrl: './banner-skeleton.component.html',
  styleUrl: './banner-skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerSkeletonComponent {
  // Number of skeleton cards to show
  skeletonCount = 8;
}



