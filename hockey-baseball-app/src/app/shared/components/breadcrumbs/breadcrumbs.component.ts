import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs';
import { NavigationService } from '../../../services/navigation.service';
import { GoalieService } from '../../../services/goalie.service';
import { PlayerService } from '../../../services/player.service';
import { TeamService } from '../../../services/team.service';

export interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: string | null;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './breadcrumbs.component.html',
  styleUrl: './breadcrumbs.component.scss',
})
export class BreadcrumbsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private navigationService = inject(NavigationService);
  private goalieService = inject(GoalieService);
  private playerService = inject(PlayerService);
  private teamService = inject(TeamService);

  breadcrumbs = signal<BreadcrumbItem[]>([]);

  ngOnInit(): void {
    this.updateBreadcrumbs();
    
    // Update breadcrumbs on route change (including query params)
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateBreadcrumbs();
      });
  }

  private updateBreadcrumbs(): void {
    const url = this.router.url;
    const items: BreadcrumbItem[] = [];

    // Parse URL segments
    const segments = url.split('/').filter(segment => segment);
    
    // If no segments or just dashboard, show only Dashboard
    if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
      items.push({
        label: 'Dashboard',
        path: '/dashboard',
        icon: this.navigationService.getMaterialIcon('dashboard'),
      });
      this.breadcrumbs.set(items);
      return;
    }

    // Check if this is a spray-chart route
    const sprayChartIndex = segments.findIndex(seg => seg === 'spray-chart');
    if (sprayChartIndex !== -1 && sprayChartIndex > 0) {
      const entityId = segments[sprayChartIndex - 1];
      
      // Build breadcrumbs up to spray-chart (Teams & Rosters > Players/Goalies)
      let currentPath = '';
      const seenLabels = new Set<string>();
      
      // Process segments up to (but not including) the ID before spray-chart
      for (let i = 0; i < sprayChartIndex - 1; i++) {
        const segment = segments[i];
        currentPath += '/' + segment;
        
        // Get label and icon from navigation service
        const label = this.navigationService.getPageTitle(currentPath);
        const icon = this.navigationService.getPageIcon(currentPath);

        // Only add if we have a valid label (not empty)
        if (label) {
          // Avoid duplicate labels
          if (!seenLabels.has(label)) {
            seenLabels.add(label);
            items.push({
              label,
              path: currentPath,
              icon,
            });
          }
        }
      }
      
      // Determine entity type from segment before ID (players or goalies)
      const entityType = sprayChartIndex > 1 && segments[sprayChartIndex - 2] === 'players' ? 'player' : 'goalie';
      
      // Fetch entity name asynchronously and add both entity name and "Spray Chart" (Spray Chart as last, non-clickable)
      if (entityType === 'player') {
        this.playerService.getPlayerById(entityId).subscribe({
          next: (player) => {
            if (player) {
              const playerName = `${player.firstName} ${player.lastName}`;
              const updatedItems = [...items];
              updatedItems.push({
                label: playerName,
                path: '/teams-and-rosters/players/player-profile/' + entityId,
                icon: 'person',
              });
              updatedItems.push({
                label: 'Spray Chart',
                path: this.router.url,
                icon: 'scatter_plot',
              });
              this.breadcrumbs.set(updatedItems);
            } else {
              // If player not found, just show "Spray Chart" as last item
              items.push({
                label: 'Spray Chart',
                path: this.router.url,
                icon: 'scatter_plot',
              });
              this.breadcrumbs.set(items);
            }
          },
          error: (error) => {
            console.error('Error loading player for breadcrumbs:', error);
            // On error, just show "Spray Chart" as last item
            items.push({
              label: 'Spray Chart',
              path: this.router.url,
              icon: 'scatter_plot',
            });
            this.breadcrumbs.set(items);
          },
        });
      } else {
        this.goalieService.getGoalieById(entityId).subscribe({
          next: (goalie) => {
            if (goalie) {
              const goalieName = `${goalie.firstName} ${goalie.lastName}`;
              const updatedItems = [...items];
              updatedItems.push({
                label: goalieName,
                path: '/teams-and-rosters/goalies/goalie-profile/' + entityId,
                icon: 'person',
              });
              updatedItems.push({
                label: 'Spray Chart',
                path: this.router.url,
                icon: 'scatter_plot',
              });
              this.breadcrumbs.set(updatedItems);
            } else {
              // If goalie not found, just show "Spray Chart" as last item
              items.push({
                label: 'Spray Chart',
                path: this.router.url,
                icon: 'scatter_plot',
              });
              this.breadcrumbs.set(items);
            }
          },
          error: (error) => {
            console.error('Error loading goalie for breadcrumbs:', error);
            // On error, just show "Spray Chart" as last item
            items.push({
              label: 'Spray Chart',
              path: this.router.url,
              icon: 'scatter_plot',
            });
            this.breadcrumbs.set(items);
          },
        });
      }
      
      // Set initial breadcrumbs (will be updated when entity data loads)
      this.breadcrumbs.set(items);
      return;
    }

    // Build breadcrumb path
    let currentPath = '';
    const seenLabels = new Set<string>();
    
    // Check if this is a spray-chart route to skip it in normal processing
    const isSprayChartRoute = segments.includes('spray-chart');
    const sprayChartIdx = isSprayChartRoute ? segments.findIndex(seg => seg === 'spray-chart') : -1;
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Skip spray-chart segment and the ID before it in normal processing (it's handled separately above)
      if (isSprayChartRoute && sprayChartIdx !== -1) {
        if (segment === 'spray-chart' || (i === sprayChartIdx - 1)) {
          continue;
        }
      }
      
      currentPath += '/' + segment;
      
      // Get label and icon from navigation service
      const label = this.navigationService.getPageTitle(currentPath);
      const icon = this.navigationService.getPageIcon(currentPath);

      // Only add if we have a valid label (not empty)
      if (label) {
        // Avoid duplicate labels
        if (!seenLabels.has(label)) {
          seenLabels.add(label);
          items.push({
            label,
            path: currentPath,
            icon,
          });
        }
      }
    }

    // If no items were added, add Dashboard as fallback
    if (items.length === 0) {
      items.push({
        label: 'Dashboard',
        path: '/dashboard',
        icon: this.navigationService.getMaterialIcon('dashboard'),
      });
    }

    // Check for query parameters to add additional breadcrumb items
    // For example: teamName from query params
    const urlParts = url.split('?');
    if (urlParts.length > 1) {
      const queryString = urlParts[1];
      const params = new URLSearchParams(queryString);
      const teamName = params.get('teamName');
      if (teamName) {
        const decodedTeamName = decodeURIComponent(teamName);
        // Add team name as additional breadcrumb item with groups icon
        items.push({
          label: decodedTeamName,
          path: this.router.url, // Keep current URL with query params
          icon: 'groups',
        });
      }
    }

    // Check for goalie-profile route and add goalie name
    const goalieProfileIndex = segments.findIndex(seg => seg === 'goalie-profile');
    if (goalieProfileIndex !== -1 && goalieProfileIndex < segments.length - 1) {
      const goalieId = segments[goalieProfileIndex + 1];
      if (goalieId) {
        // Fetch goalie name asynchronously
        this.goalieService.getGoalieById(goalieId).subscribe({
          next: (goalie) => {
            if (goalie) {
              const goalieName = `${goalie.firstName} ${goalie.lastName}`;
              // Update breadcrumbs with goalie name
              const updatedItems = [...items];
              updatedItems.push({
                label: goalieName,
                path: this.router.url,
                icon: 'person',
              });
              this.breadcrumbs.set(updatedItems);
            } else {
              this.breadcrumbs.set(items);
            }
          },
          error: (error) => {
            console.error('Error loading goalie for breadcrumbs:', error);
            this.breadcrumbs.set(items);
          },
        });
        // Set initial breadcrumbs without goalie name (will be updated when data loads)
        this.breadcrumbs.set(items);
        return;
      }
    }

    // Check for player-profile route and add player name
    const playerProfileIndex = segments.findIndex(seg => seg === 'player-profile');
    if (playerProfileIndex !== -1 && playerProfileIndex < segments.length - 1) {
      const playerId = segments[playerProfileIndex + 1];
      if (playerId) {
        // Fetch player name asynchronously
        this.playerService.getPlayerById(playerId).subscribe({
          next: (player) => {
            if (player) {
              const playerName = `${player.firstName} ${player.lastName}`;
              // Update breadcrumbs with player name
              const updatedItems = [...items];
              updatedItems.push({
                label: playerName,
                path: this.router.url,
                icon: 'person',
              });
              this.breadcrumbs.set(updatedItems);
            } else {
              this.breadcrumbs.set(items);
            }
          },
          error: (error) => {
            console.error('Error loading player for breadcrumbs:', error);
            this.breadcrumbs.set(items);
          },
        });
        // Set initial breadcrumbs without player name (will be updated when data loads)
        this.breadcrumbs.set(items);
        return;
      }
    }

    // Check for team-profile route and add team name
    const teamProfileIndex = segments.findIndex(seg => seg === 'team-profile');
    if (teamProfileIndex !== -1 && teamProfileIndex < segments.length - 1) {
      const teamId = segments[teamProfileIndex + 1];
      if (teamId) {
        // Fetch team name asynchronously
        this.teamService.getTeamById(teamId).subscribe({
          next: (team) => {
            if (team) {
              const teamName = team.name;
              // Update breadcrumbs with team name
              const updatedItems = [...items];
              updatedItems.push({
                label: teamName,
                path: this.router.url,
                icon: 'groups',
              });
              this.breadcrumbs.set(updatedItems);
            } else {
              this.breadcrumbs.set(items);
            }
          },
          error: (error) => {
            console.error('Error loading team for breadcrumbs:', error);
            this.breadcrumbs.set(items);
          },
        });
        // Set initial breadcrumbs without team name (will be updated when data loads)
        this.breadcrumbs.set(items);
        return;
      }
    }

    this.breadcrumbs.set(items);
  }

  navigateTo(path: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    // Remove query params from path if present (for navigation to parent pages)
    const pathWithoutQuery = path.split('?')[0];
    // Split path into segments and navigate
    const segments = pathWithoutQuery.split('/').filter(segment => segment);
    this.router.navigate(segments);
  }

  isLast(index: number): boolean {
    return index === this.breadcrumbs().length - 1;
  }
}

