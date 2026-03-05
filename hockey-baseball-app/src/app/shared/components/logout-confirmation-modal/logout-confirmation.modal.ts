import { Component, inject, signal } from '@angular/core';
import { ModalService } from '../../../services/modal.service';
import { AuthService } from '../../../services/auth.service';
import { NavigationService } from '../../../services/navigation.service';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { ButtonComponent } from '../buttons/button/button.component';

@Component({
  selector: 'app-logout-confirmation-modal',
  imports: [ButtonLoadingComponent, ButtonComponent],
  templateUrl: './logout-confirmation.modal.html',
  styleUrl: './logout-confirmation.modal.scss',
})
export class LogoutConfirmationModal {
  private modalService = inject(ModalService);
  private authService = inject(AuthService);
  private navigationService = inject(NavigationService);

  protected isLoggingOut = signal(false);

  protected logout(): void {
    this.isLoggingOut.set(true);
    this.authService.signOut().subscribe({
      next: () => {
        this.isLoggingOut.set(false);
        this.modalService.closeAll();
        this.navigationService.navigate('/sign-in');
      },
      error: (error) => {
        console.error('Error during sign out:', error);
        this.isLoggingOut.set(false);
        this.modalService.closeAll();
        this.navigationService.navigate('/sign-in');
      },
    });
  }

  protected close(): void {
    this.modalService.closeModal();
  }
}
