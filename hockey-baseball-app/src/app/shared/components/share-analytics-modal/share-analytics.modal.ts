import { Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { ModalService, ModalEvent } from '../../../services/modal.service';
import { AnalysisService } from '../../../services/analysis.service';
import { ToastService } from '../../../services/toast.service';
import { AnalyticsAccessOut, UserSearchOut } from '../../interfaces/analysis.interface';
import { ButtonComponent } from '../buttons/button/button.component';
import { ComponentDisableToggleDirective } from '../../directives/component-disable-toggle.directive';
import { DisplayTemplateModal } from '../display-template-modal/display-template.modal';

export interface ShareAnalyticsModalData {
  analyticsId: number;
  analyticsTitle: string;
  existingAccess: AnalyticsAccessOut[];
}

@Component({
  selector: 'app-share-analytics-modal',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatDividerModule,
    ButtonComponent,
    ComponentDisableToggleDirective,
  ],
  templateUrl: './share-analytics.modal.html',
  styleUrl: './share-analytics.modal.scss',
})
export class ShareAnalyticsModal implements OnInit {
  private modalService = inject(ModalService);
  private analysisService = inject(AnalysisService);
  private toast = inject(ToastService);

  protected existingAccess = signal<AnalyticsAccessOut[]>([]);
  protected emailControl = signal(new FormControl('', { nonNullable: true }));
  protected searchResultsList = signal<UserSearchOut[]>([]);
  protected addedEmails = signal<string[]>([]);

  protected confirmNewEmails = signal<string[]>([]);
  protected confirmKeptEmails = signal<string[]>([]);
  protected confirmRemovedEmails = signal<string[]>([]);

  private originalAccess = signal<AnalyticsAccessOut[]>([]);
  private pendingValidEmail = signal(false);
  private confirmTemplate = viewChild.required<TemplateRef<unknown>>('confirmTemplate');
  private analyticsId = 0;

  protected hasChanges = computed(() => {
    if (this.pendingValidEmail()) return true;

    const originalEmails = new Set(this.originalAccess().map((a) => a.email));
    const currentEmails = new Set(this.existingAccess().map((a) => a.email));
    const added = this.addedEmails();

    if (added.length > 0) return true;

    if (originalEmails.size !== currentEmails.size) return true;
    for (const email of originalEmails) {
      if (!currentEmails.has(email)) return true;
    }

    return false;
  });

  ngOnInit(): void {
    const data = this.modalService.getModalData<ShareAnalyticsModalData>();
    if (!data) return;

    this.analyticsId = data.analyticsId;
    this.existingAccess.set(data.existingAccess);
    this.originalAccess.set(data.existingAccess);
  }

  protected removeExistingAccess(email: string): void {
    this.existingAccess.update((list) => list.filter((a) => a.email !== email));
  }

  protected onEmailInput(): void {
    const value = this.emailControl().value.trim();
    this.pendingValidEmail.set(this.isValidEmail(value));

    if (value.length < 2) {
      this.searchResultsList.set([]);
      return;
    }

    this.analysisService.searchUsers({ email: value }).subscribe({
      next: (users) => {
        const existingEmails = new Set(this.existingAccess().map((a) => a.email));
        const addedEmails = new Set(this.addedEmails());
        this.searchResultsList.set(
          users.filter((u) => !existingEmails.has(u.email) && !addedEmails.has(u.email))
        );
      },
    });
  }

  protected selectUser(user: UserSearchOut): void {
    this.emailControl().setValue(user.email);
    this.pendingValidEmail.set(true);
    this.searchResultsList.set([]);
  }

  protected addEmail(): void {
    const email = this.emailControl().value.trim();
    if (!email || !this.isValidEmail(email)) return;

    const existingEmails = new Set(this.existingAccess().map((a) => a.email));
    if (existingEmails.has(email) || this.addedEmails().includes(email)) return;

    this.addedEmails.update((emails) => [...emails, email]);
    this.emailControl().setValue('');
    this.pendingValidEmail.set(false);
    this.searchResultsList.set([]);
  }

  protected removeAddedEmail(email: string): void {
    this.addedEmails.update((emails) => emails.filter((e) => e !== email));
  }

  protected onShare(): void {
    const pendingEmail = this.emailControl().value.trim();
    if (pendingEmail && this.isValidEmail(pendingEmail)) {
      const existingEmails = new Set(this.existingAccess().map((a) => a.email));
      if (!existingEmails.has(pendingEmail) && !this.addedEmails().includes(pendingEmail)) {
        this.addedEmails.update((emails) => [...emails, pendingEmail]);
      }
      this.emailControl().setValue('');
      this.pendingValidEmail.set(false);
    }

    const allEmails = [...this.existingAccess().map((a) => a.email), ...this.addedEmails()];

    this.openConfirmation(allEmails);
  }

  protected close(): void {
    this.modalService.closeModal();
  }

  private openConfirmation(emails: string[]): void {
    const originalEmails = new Set(this.originalAccess().map((a) => a.email));
    const currentEmails = new Set(emails);

    this.confirmNewEmails.set(this.addedEmails());
    this.confirmKeptEmails.set(emails.filter((e) => originalEmails.has(e)));
    this.confirmRemovedEmails.set(
      this.originalAccess()
        .map((a) => a.email)
        .filter((e) => !currentEmails.has(e))
    );

    this.modalService.openModal(DisplayTemplateModal, {
      name: 'Confirm Share',
      icon: 'share',
      data: {
        template: this.confirmTemplate(),
        buttonText: 'Share',
        buttonIcon: 'share',
        color: 'blue',
        colorSoft: 'blue_dark',
        withButtonLoading: true,
      },
      onCloseWithDataProcessing: () => {
        this.analysisService.updateAnalyticsAccess(this.analyticsId, emails).subscribe({
          next: () => {
            this.toast.show('Analysis access updated successfully', 'success');
            this.modalService.closeModal();
            this.refreshAccess();
          },
          error: () => {
            this.toast.show('Failed to update analysis access', 'error');
            this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
          },
        });
      },
    });
  }

  private refreshAccess(): void {
    this.analysisService.getAnalyticsAccess(this.analyticsId).subscribe({
      next: (access) => {
        this.existingAccess.set(access);
        this.originalAccess.set(access);
        this.addedEmails.set([]);
      },
    });
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
