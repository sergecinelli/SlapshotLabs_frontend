import { Component , ChangeDetectionStrategy } from '@angular/core';
import {  } from '@angular/common';

@Component({
  selector: 'app-game-card-skeleton',
  imports: [],
  templateUrl: './game-card-skeleton.component.html',
  styleUrl: './game-card-skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameCardSkeletonComponent {
  skeletonCountUpcoming = 2;
  skeletonCountGameResults = 6;
}

