import { Component, inject  } from '@angular/core';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { MatIconModule } from '@angular/material/icon';
import { convertLocalToGMT } from '../../utils/time-converter.util';

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
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ButtonComponent,
    ButtonLoadingComponent,
    MatIconModule
],
  templateUrl: './custom-highlight.modal.html',
  styleUrls: ['./custom-highlight.modal.scss'],
})
export class CustomHighlightModal {
  private dialogRef = inject<MatDialogRef<CustomHighlightModal>>(MatDialogRef);
  private fb = inject(FormBuilder);

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(1000)]],
    date: [new Date().toISOString().slice(0, 10), [Validators.required]],
    time: ['', [Validators.required, Validators.pattern(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/)]],
    youtube_link: ['', [Validators.maxLength(500)]],
  });

  onCancel(): void {
    this.dialogRef.close();
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
    this.dialogRef.close(value);
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (control.errors['pattern']) {
        return 'Time must be in HH:mm or HH:mm:ss format (e.g., 14:30 or 14:30:00)';
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      name: 'Name',
      description: 'Description',
      date: 'Date',
      time: 'Time',
      youtube_link: 'Video Link',
    };
    return labels[fieldName] || fieldName;
  }
}
