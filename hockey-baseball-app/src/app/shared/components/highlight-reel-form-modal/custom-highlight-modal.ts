import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface CustomHighlightFormResult {
  name: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm or HH:mm:ss
  youtube_link: string;
}

@Component({
  selector: 'app-custom-highlight-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './custom-highlight-modal.html',
  styleUrls: ['./custom-highlight-modal.scss'],
})
export class CustomHighlightModalComponent {
  private dialogRef = inject<MatDialogRef<CustomHighlightModalComponent>>(MatDialogRef);
  private fb = inject(FormBuilder);

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(1000)]],
    date: [new Date().toISOString().slice(0, 10), [Validators.required]],
    time: ['', [Validators.required, Validators.pattern(/^([0-5]?[0-9]):([0-5][0-9])$/)]],
    youtube_link: ['', [Validators.maxLength(500)]],
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.invalid) return;
    const value = this.form.value as CustomHighlightFormResult;
    this.dialogRef.close(value);
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (control.errors['pattern']) {
        return 'Time must be in mm:ss format (e.g., 12:45)';
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
      youtube_link: 'Video Link'
    };
    return labels[fieldName] || fieldName;
  }
}
