import {
  Component,
  ViewEncapsulation,
  OnInit,
  OnDestroy,
  inject,
  output,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { NgComponentOutlet } from '@angular/common';
import { IModalParams, ModalService, ModalEvent } from '../../../services/modal.service';
import { SetFocusDirective } from '../../directives/set-focus.directive';
import { AnimationDirective } from '../../directives/animation.directive';
import { ButtonComponent } from '../buttons/button/button.component';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [SetFocusDirective, AnimationDirective, ButtonComponent, NgComponentOutlet],
})
export class ModalComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);

  content: any;
  params?: IModalParams | null;

  closed = output<any>();
  closedWithData = output<any>();
  closedWithDataProcessing = output<any>();
  backdropClicked = output<any>();

  protected isActiveModal = signal(true);
  protected isLoading = signal(false);

  private subscriptions = new Subscription();

  close(data?: any): void {
    this.isActiveModal.set(false);
    setTimeout(() => this.closed.emit(data), 200);
  }

  closeWithData(data?: any): void {
    this.isActiveModal.set(false);
    setTimeout(() => this.closedWithData.emit(data), 200);
  }

  closeWithDataProcessing(data?: any): void {
    setTimeout(() => this.closedWithDataProcessing.emit(data), 200);
  }

  backdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement) !== (event.currentTarget as HTMLElement)) return;
    if (this.params?.preventBackdropClose) return;

    this.isActiveModal.set(false);
    setTimeout(() => this.backdropClicked.emit(undefined), 200);
  }

  ngOnInit(): void {
    this.isLoading.set(this.params?.loading ?? false);

    this.subscriptions.add(
      this.modalService.onEvent$.subscribe((event) => {
        if (event === ModalEvent.StopHeaderLoading) {
          this.isLoading.set(false);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
