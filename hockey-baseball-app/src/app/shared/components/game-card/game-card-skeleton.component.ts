import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game-card-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-card-skeleton.component.html',
  styleUrl: './game-card-skeleton.component.scss',
})
export class GameCardSkeletonComponent {
  skeletonCountUpcoming = 2;
  skeletonCountGameResults = 6;
}

