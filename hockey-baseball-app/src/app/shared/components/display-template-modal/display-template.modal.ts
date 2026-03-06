import { Component, OnInit, TemplateRef, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ModalService, ModalEvent } from '../../../services/modal.service';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { ButtonComponent } from '../buttons/button/button.component';
import { AppColor } from '../../constants/colors';

export interface DisplayTemplateModalData {
  template: TemplateRef<unknown>;
  buttonText: string;
  buttonIcon?: string;
  color?: AppColor;
  colorSoft?: AppColor;
  withButtonLoading?: boolean;
}

@Component({
  selector: 'app-display-template-modal',
  imports: [NgTemplateOutlet, ButtonLoadingComponent, ButtonComponent],
  templateUrl: './display-template.modal.html',
  styleUrl: './display-template.modal.scss',
})
export class DisplayTemplateModal implements OnInit {
  private modalService = inject(ModalService);

  protected template: TemplateRef<unknown> | null = null;
  protected buttonText = '';
  protected buttonIcon = 'check_circle';
  protected color: AppColor = 'primary';
  protected colorSoft: AppColor = 'primary_dark';
  protected withButtonLoading = false;
  protected isLoading = signal(false);

  ngOnInit(): void {
    const data = this.modalService.getModalData<DisplayTemplateModalData>();

    if (data) {
      this.template = data.template;
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
