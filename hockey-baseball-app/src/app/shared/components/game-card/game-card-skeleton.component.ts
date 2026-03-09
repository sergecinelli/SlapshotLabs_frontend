import { Component, input } from '@angular/core';

@Component({
  selector: 'app-game-card-skeleton',
  imports: [],
  templateUrl: './game-card-skeleton.component.html',
  styleUrl: './game-card-skeleton.component.scss',
})
export class GameCardSkeletonComponent {
  count = input(2);
  showScore = input(false);
}
