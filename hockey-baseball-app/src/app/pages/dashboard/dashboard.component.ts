import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  stats = [
    { label: 'Total Teams', value: '12', icon: '🏒' },
    { label: 'Active Players', value: '185', icon: '👤' },
    { label: 'Games Played', value: '47', icon: '🥅' },
    { label: 'Videos', value: '23', icon: '📹' }
  ];

  recentActivity = [
    'New player John Smith added to Rangers team',
    'Game scheduled: Rangers vs Hawks - Oct 15, 2025',
    'Training video uploaded for goalies',
    'Player stats updated for Sarah Johnson',
    'Team photo session completed for Eagles'
  ];
}
