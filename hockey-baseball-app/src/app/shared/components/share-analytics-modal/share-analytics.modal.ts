import {
  Component,
  OnInit,
  OnDestroy,
  TemplateRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { emailValidator } from '../../validators/email.validator';
import { getFieldError } from '../../validators/form-error.util';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { CustomAutocompleteComponent } from '../custom-autocomplete/custom-autocomplete.component';
import { SelectOption } from '../custom-select/custom-select.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ModalService, ModalEvent } from '../../../services/modal.service';
import { AnalysisService } from '../../../services/analysis.service';
import { ToastService } from '../../../services/toast.service';
import { AnalyticsAccessOut } from '../../interfaces/analysis.interface';
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
    SectionHeaderComponent,
    FormFieldComponent,
    CustomAutocompleteComponent,
    MatTooltipModule,
    ButtonComponent,
    ComponentDisableToggleDirective,
  ],
  templateUrl: './share-analytics.modal.html',
  styleUrl: './share-analytics.modal.scss',
})
export class ShareAnalyticsModal implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private analysisService = inject(AnalysisService);
  private toast = inject(ToastService);

  protected existingAccess = signal<AnalyticsAccessOut[]>([]);
  protected emailControl = signal(
    new FormControl('', { nonNullable: true, validators: [emailValidator] })
  );
  protected searchOptions = signal<SelectOption[]>([]);
  protected addedEmails = signal<string[]>([]);

  protected confirmNewEmails = signal<string[]>([]);
  protected confirmKeptEmails = signal<string[]>([]);
  protected confirmRemovedEmails = signal<string[]>([]);

  private originalAccess = signal<AnalyticsAccessOut[]>([]);
  private pendingValidEmail = signal(false);
  private confirmTemplate = viewChild.required<TemplateRef<unknown>>('confirmTemplate');
  private analyticsId = 0;
  private valueChangesSub: Subscription | null = null;

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

    this.valueChangesSub = this.emailControl().valueChanges.subscribe((value) => {
      const trimmed = value.trim();
      this.pendingValidEmail.set(this.emailControl().valid && trimmed.length > 0);

      if (trimmed.length < 2) {
        this.searchOptions.set([]);
        return;
      }

      this.analysisService.searchUsers({ email: trimmed }).subscribe({
        next: (users) => {
          const existingEmails = new Set(this.existingAccess().map((a) => a.email));
          const addedEmails = new Set(this.addedEmails());
          const filtered = users.filter(
            (u) => !existingEmails.has(u.email) && !addedEmails.has(u.email)
          );
          this.searchOptions.set(
            filtered.map((u) => ({
              label: `${u.first_name} ${u.last_name} (${u.email})`,
              value: u.email,
            }))
          );
        },
      });
    });
  }

  ngOnDestroy(): void {
    this.valueChangesSub?.unsubscribe();
  }

  protected removeExistingAccess(email: string): void {
    this.existingAccess.update((list) => list.filter((a) => a.email !== email));
  }

  protected addEmail(): void {
    const control = this.emailControl();
    control.markAsTouched();
    const email = control.value.trim();
    if (!email || control.invalid) return;

    const existingEmails = new Set(this.existingAccess().map((a) => a.email));
    if (existingEmails.has(email) || this.addedEmails().includes(email)) return;

    this.addedEmails.update((emails) => [...emails, email]);
    control.setValue('');
    this.pendingValidEmail.set(false);
    this.searchOptions.set([]);
  }

  protected removeAddedEmail(email: string): void {
    this.addedEmails.update((emails) => emails.filter((e) => e !== email));
  }

  protected onShare(): void {
    const control = this.emailControl();
    const pendingEmail = control.value.trim();
    if (pendingEmail && control.valid) {
      const existingEmails = new Set(this.existingAccess().map((a) => a.email));
      if (!existingEmails.has(pendingEmail) && !this.addedEmails().includes(pendingEmail)) {
        this.addedEmails.update((emails) => [...emails, pendingEmail]);
      }
      control.setValue('');
      this.pendingValidEmail.set(false);
    }

    const allEmails = [...this.existingAccess().map((a) => a.email), ...this.addedEmails()];
    this.openConfirmation(allEmails);
  }

  protected getEmailError(): string {
    return getFieldError(this.emailControl(), 'Email');
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
        buttonText: 'Confirm',
        buttonIcon: 'check_circle',
        color: 'green',
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
}
