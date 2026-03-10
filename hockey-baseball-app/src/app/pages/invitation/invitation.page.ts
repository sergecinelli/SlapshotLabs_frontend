import { Component, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { AuthLayoutComponent } from '../../shared/components/auth-layout/auth-layout.component';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';
import { ListComponent, IListItem } from '../../shared/components/list/list.component';

@Component({
  selector: 'app-invitation',
  imports: [AuthLayoutComponent, ButtonLoadingComponent, ListComponent],
  templateUrl: './invitation.page.html',
  styleUrl: './invitation.page.scss',
})
export class InvitationPage {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  isLoading = signal(false);

  private get token(): string {
    return this.route.snapshot.params['token'];
  }

  private get redirectUrl(): string {
    return this.route.snapshot.queryParams['redirect'] || '/dashboard';
  }

  protected readonly features: IListItem[] = [
    {
      key: 'analytics',
      icon: 'bar_chart',
      name: 'Player & Team Analytics',
      secondDescription: 'Advanced performance metrics and trends',
    },
    {
      key: 'dashboard',
      icon: 'sports_hockey',
      name: 'Live Game Dashboard',
      secondDescription: 'Real-time scores and play-by-play tracking',
    },
    {
      key: 'video',
      icon: 'videocam',
      name: 'Video Library & Highlights',
      secondDescription: 'Review game footage and key moments',
    },
    {
      key: 'spray-charts',
      icon: 'scatter_plot',
      name: 'Spray Charts',
      secondDescription: 'Visual shot placement and scoring patterns',
    },
    {
      key: 'schedules',
      icon: 'calendar_month',
      name: 'Game Schedules',
      secondDescription: 'Upcoming games, venues, and game types',
    },
    {
      key: 'rosters',
      icon: 'groups',
      name: 'Team & Player Rosters',
      secondDescription: 'Manage teams, players, and goalies',
    },
    {
      key: 'gamesheets',
      icon: 'description',
      name: 'Gamesheets',
      secondDescription: 'Detailed game logs with shots, penalties, and faceoffs',
    },
    {
      key: 'tryouts',
      icon: 'assignment_ind',
      name: 'Tryout Management',
      secondDescription: 'Evaluate and track player tryout performance',
    },
  ];

  acceptInvitation(): void {
    this.isLoading.set(true);

    this.authService.acceptInvitation(this.token).subscribe({
      next: () => {
        this.isLoading.set(false);
        if (this.authService.isAuthenticated()) {
          this.router.navigate([this.redirectUrl]);
        } else {
          this.router.navigate(['/sign-in'], {
            queryParams: { returnUrl: this.redirectUrl },
          });
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (error.status === 404) {
          this.router.navigate(['/sign-up'], {
            queryParams: { returnUrl: this.redirectUrl },
          });
        } else {
          this.toastService.show(error.error?.message || 'Something went wrong', 'error');
        }
      },
    });
  }
}
