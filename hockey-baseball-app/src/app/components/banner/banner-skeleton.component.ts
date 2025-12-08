import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-banner-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banner-skeleton.html',
  styleUrl: './banner-skeleton.scss',
})
export class BannerSkeletonComponent {
  // Number of skeleton cards to show
  skeletonCount = 8;
}



