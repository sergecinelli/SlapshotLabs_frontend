import { Component, inject } from '@angular/core';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ModalService } from '../../../services/modal.service';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { convertLocalToGMT } from '../../utils/time-converter.util';
import { youtubeUrlValidator } from '../../validators/url.validator';
import { getFieldError } from '../../validators/form-error.util';

export interface CustomHighlightFormResult {
  name: string;
  description: string;
  date: string; // YYYY-MM-DD (local date)
  time: string; // HH:mm:ss (local time in 24-hour format)
  youtube_link: string;
  // GMT values for API
  gmtDate: string; // YYYY-MM-DD (GMT date)
  gmtTime: string; // HH:mm:ss (GMT time)
}

@Component({
  selector: 'app-custom-highlight-modal',
  imports: [ReactiveFormsModule, ButtonComponent, ButtonLoadingComponent, FormFieldComponent],
  templateUrl: './custom-highlight.modal.html',
  styleUrls: ['./custom-highlight.modal.scss'],
})
export class CustomHighlightModal {
  private modalService = inject(ModalService);
  private fb = inject(FormBuilder);

  constructor() {
    this.modalService.registerDirtyCheck(() => this.form.dirty);
  }

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(1000)]],
    date: [new Date().toISOString().slice(0, 10), [Validators.required]],
    time: [
      '',
      [
        Validators.required,
        Validators.pattern(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/),
      ],
    ],
    youtube_link: ['', [youtubeUrlValidator, Validators.maxLength(500)]],
  });

  onCancel(): void {
    this.modalService.closeModal();
  }

  onSave(): void {
    if (this.form.invalid) return;
    const formValue = this.form.value;

    // Ensure time is in HH:mm:ss format (add seconds if missing)
    let time24Hour = formValue.time;
    if (time24Hour && time24Hour.split(':').length === 2) {
      time24Hour = `${time24Hour}:00`;
    }

    // Convert local date and time to GMT
    const gmtDateTime = convertLocalToGMT(formValue.date, time24Hour);

    const value: CustomHighlightFormResult = {
      name: formValue.name,
      description: formValue.description,
      date: formValue.date, // Keep local date for display
      time: time24Hour, // Keep local time for display
      youtube_link: formValue.youtube_link,
      gmtDate: gmtDateTime.date,
      gmtTime: gmtDateTime.time,
    };
    this.modalService.closeWithData(value);
  }

  private readonly fieldLabels: Record<string, string> = {
    name: 'Name',
    description: 'Description',
    date: 'Date',
    time: 'Time',
    youtube_link: 'Video Link',
  };

  getErrorMessage(fieldName: string): string {
    return getFieldError(this.form.get(fieldName), this.fieldLabels[fieldName] || fieldName, {
      pattern: 'Time must be in HH:mm or HH:mm:ss format (e.g., 14:30 or 14:30:00)',
    });
  }
}
