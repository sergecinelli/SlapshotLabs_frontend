import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';
import { SeasonIdModal } from '../../shared/components/season-id-modal/season-id.modal';
import { BreadcrumbActionsDirective } from '../../shared/directives/breadcrumb-actions.directive';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import { EmptyLabelComponent } from '../../shared/components/empty-label/empty-label.component';
import { ClickableTextComponent } from '../../shared/components/clickable-text/clickable-text.component';

@Component({
  selector: 'app-gamesheet',
  imports: [
    BreadcrumbActionsDirective,
    ButtonComponent,
    EmptyLabelComponent,
    ClickableTextComponent,
  ],
  templateUrl: './gamesheet.page.html',
  styleUrl: './gamesheet.page.scss',
})
export class GamesheetPage implements OnInit {
  private sanitizer = inject(DomSanitizer);
  private authService = inject(AuthService);
  private modalService = inject(ModalService);

  protected seasonId = signal<string | null>(null);
  protected isModalOpen = signal(false);

  protected gamesheetUrl = computed<SafeResourceUrl | null>(() => {
    const id = this.seasonId();
    if (!id) return null;
    const url = `https://gamesheetstats.com/seasons/${id}/standings`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  ngOnInit(): void {
    const user = this.authService.getCurrentUserValue();
    if (user?.gamesheet_seasonid) {
      this.seasonId.set(user.gamesheet_seasonid);
    } else {
      this.openSeasonIdModal();
    }
  }

  protected openSeasonIdModal(): void {
    this.isModalOpen.set(true);
    this.modalService.openModal(SeasonIdModal, {
      name: 'Gamesheet Access',
      icon: 'edit',
      showClose: !!this.seasonId(),
      data: { currentSeasonId: this.seasonId() },
      width: '500px',
      onClose: () => {
        this.isModalOpen.set(false);
      },
      onCloseWithData: (data: unknown) => {
        this.isModalOpen.set(false);
        this.seasonId.set(data as string | null);
      },
    });
  }
}
