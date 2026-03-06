import { Component, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ModalService, ModalEvent } from '../../../services/modal.service';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { ButtonComponent } from '../buttons/button/button.component';
import { AppColor } from '../../constants/colors';

export interface DisplayTextModalData {
  text: string;
  buttonText: string;
  buttonIcon?: string;
  color?: AppColor;
  colorSoft?: AppColor;
  withButtonLoading?: boolean;
}

@Component({
  selector: 'app-display-text-modal',
  imports: [ButtonLoadingComponent, ButtonComponent],
  templateUrl: './display-text.modal.html',
  styleUrl: './display-text.modal.scss',
})
export class DisplayTextModal implements OnInit {
  private modalService = inject(ModalService);
  private sanitizer = inject(DomSanitizer);

  protected safeText: SafeHtml = '';
  protected buttonText = '';
  protected buttonIcon = 'check_circle';
  protected color: AppColor = 'primary';
  protected colorSoft: AppColor = 'primary_dark';
  protected withButtonLoading = false;
  protected isLoading = signal(false);

  ngOnInit(): void {
    const data = this.modalService.getModalData<DisplayTextModalData>();

    if (data) {
      this.safeText = this.sanitizer.bypassSecurityTrustHtml(data.text);
      this.buttonText = data.buttonText;
      this.buttonIcon = data.buttonIcon ?? 'check_circle';
      this.color = data.color ?? 'primary';
      this.colorSoft = data.colorSoft ?? 'primary_dark';
      this.withButtonLoading = data.withButtonLoading ?? false;
    }

    this.modalService.onEvent$.subscribe((event) => {
      if (event === ModalEvent.StopButtonLoading) this.isLoading.set(false);
    });
  }

  protected confirm(): void {
    if (this.withButtonLoading) {
      this.isLoading.set(true);
      this.modalService.closeWithDataProcessing(true);
    } else {
      this.modalService.closeWithData(true);
    }
  }

  protected close(): void {
    this.modalService.closeModal();
  }
}
