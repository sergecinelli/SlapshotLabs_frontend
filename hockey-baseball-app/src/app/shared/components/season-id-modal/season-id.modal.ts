import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { ModalService } from '../../../services/modal.service';
import { AuthService } from '../../../services/auth.service';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { ButtonComponent } from '../buttons/button/button.component';
import { FormFieldComponent } from '../form-field/form-field.component';

interface SeasonIdModalData {
  currentSeasonId?: string | null;
}

@Component({
  selector: 'app-season-id-modal',
  imports: [ReactiveFormsModule, ButtonLoadingComponent, ButtonComponent, FormFieldComponent],
  templateUrl: './season-id.modal.html',
  styleUrl: './season-id.modal.scss',
})
export class SeasonIdModal {
  private modalService = inject(ModalService);
  private authService = inject(AuthService);
  private dialogData = this.modalService.getModalData<SeasonIdModalData>();

  protected isSubmitting = signal(false);
  protected seasonIdControl = new FormControl<string | null>(
    this.dialogData?.currentSeasonId ?? null
  );

  constructor() {
    this.modalService.registerDirtyCheck(() => this.seasonIdControl.dirty);
  }

  protected submit(): void {
    if (this.isSubmitting()) return;

    const value = this.seasonIdControl.value;
    const rawValue = value != null && value !== '' ? String(value) : null;
    this.isSubmitting.set(true);

    this.authService.editUser({ gamesheet_seasonid: rawValue }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.modalService.closeWithData(rawValue);
      },
      error: () => {
        this.isSubmitting.set(false);
      },
    });
  }

  protected close(): void {
    this.modalService.closeModal();
  }
}
