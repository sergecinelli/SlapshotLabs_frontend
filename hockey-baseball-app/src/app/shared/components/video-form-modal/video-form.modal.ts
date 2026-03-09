import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ModalService, ModalEvent } from '../../../services/modal.service';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { youtubeUrlValidator } from '../../validators/url.validator';
import { getFieldError } from '../../validators/form-error.util';
import { Video } from '../../interfaces/video.interface';

export interface VideoFormModalData {
  video?: Video;
  isEditMode: boolean;
}

@Component({
  selector: 'app-video-form-modal',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    ButtonLoadingComponent,
    SectionHeaderComponent,
    FormFieldComponent,
  ],
  templateUrl: './video-form.modal.html',
  styleUrl: './video-form.modal.scss',
})
export class VideoFormModal implements OnInit {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  data = inject(ModalService).getModalData<VideoFormModalData>();

  videoForm: FormGroup;
  isEditMode: boolean;
  isSubmitting = signal(false);

  constructor() {
    this.isEditMode = this.data.isEditMode;
    this.videoForm = this.createForm();

    this.modalService.registerDirtyCheck(() => this.videoForm.dirty);
    this.modalService.onEvent$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event === ModalEvent.StopButtonLoading) {
        this.isSubmitting.set(false);
      }
    });
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
      youtube_link: ['', [Validators.required, youtubeUrlValidator]],
    });
  }

  private populateForm(video: Video): void {
    this.videoForm.patchValue({
      name: video.name,
      description: video.description,
      youtube_link: video.youtube_link,
    });
  }

  onSubmit(): void {
    if (this.videoForm.invalid) {
      Object.keys(this.videoForm.controls).forEach((key) => {
        this.videoForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.videoForm.value;
    this.isSubmitting.set(true);
    this.modalService.closeWithDataProcessing({
      name: formValue.name,
      description: formValue.description,
      youtube_link: formValue.youtube_link,
    });
  }

  onCancel(): void {
    this.modalService.closeModal();
  }

  private readonly fieldLabels: Record<string, string> = {
    name: 'Video Name',
    description: 'Description',
    youtube_link: 'YouTube Link',
  };

  getErrorMessage(field: string): string {
    return getFieldError(this.videoForm.get(field), this.fieldLabels[field] || field);
  }
}
