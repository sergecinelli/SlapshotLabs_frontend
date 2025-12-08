import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-skeleton.html',
  styleUrl: './dashboard-skeleton.scss',
})
export class DashboardSkeletonComponent {
  // Number of skeleton items to show
  skeletonCount = 5;
}

