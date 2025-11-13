import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Video } from '../../interfaces/video.interface';

export interface VideoFormModalData {
  video?: Video;
  isEditMode: boolean;
}

@Component({
  selector: 'app-video-form-modal',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './video-form-modal.html',
  styleUrl: './video-form-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideoFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<VideoFormModalComponent>>(MatDialogRef);
  data = inject<VideoFormModalData>(MAT_DIALOG_DATA);

  videoForm: FormGroup;
  isEditMode: boolean;

  constructor() {
    this.isEditMode = this.data.isEditMode;
    this.videoForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.video) {
      this.populateForm(this.data.video);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.required, Validators.maxLength(1000)]],
      youtube_link: ['', [Validators.required, this.youtubeUrlValidator]]
    });
  }

  /**
   * Custom validator for YouTube URLs
   */
  private youtubeUrlValidator(control: { value: string }) {
    if (!control.value) {
      return null;
    }
    
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+(&[\w=]*)*$/;
    return youtubeRegex.test(control.value) ? null : { invalidYoutubeUrl: true };
  }

  private populateForm(video: Video): void {
    this.videoForm.patchValue({
      name: video.name,
      description: video.description,
      youtube_link: video.youtube_link
    });
  }

  onSubmit(): void {
    if (this.videoForm.valid) {
      const formValue = this.videoForm.value;
      this.dialogRef.close({
        name: formValue.name,
        description: formValue.description,
        youtube_link: formValue.youtube_link
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  get name() {
    return this.videoForm.get('name');
  }

  get description() {
    return this.videoForm.get('description');
  }

  get youtube_link() {
    return this.videoForm.get('youtube_link');
  }

  getErrorMessage(field: string): string {
    const control = this.videoForm.get(field);
    
    if (!control || !control.errors) {
      return '';
    }

    if (control.hasError('required')) {
      const fieldName = field === 'youtube_link' ? 'YouTube link' : field.charAt(0).toUpperCase() + field.slice(1);
      return `${fieldName} is required`;
    }

    if (control.hasError('maxlength')) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `Cannot exceed ${maxLength} characters`;
    }

    if (control.hasError('invalidYoutubeUrl')) {
      return 'Please enter a valid YouTube URL';
    }

    return 'Invalid field';
  }
}
