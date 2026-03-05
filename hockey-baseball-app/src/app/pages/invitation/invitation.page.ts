import { Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';

@Component({
  selector: 'app-invitation',
  imports: [ButtonLoadingComponent],
  templateUrl: './invitation.page.html',
  styleUrl: './invitation.page.scss',
})
export class InvitationPage {
  private router = inject(Router);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  token = input.required<string>();
  isLoading = signal(false);

  acceptInvitation(): void {
    this.isLoading.set(true);

    this.authService.acceptInvitation(this.token()).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.toastService.show(error.message, 'error');
      },
    });
  }
}
