import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';
import { SeasonIdModal } from '../../shared/components/season-id-modal/season-id.modal';
import { BreadcrumbActionsDirective } from '../../shared/directives/breadcrumb-actions.directive';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';

@Component({
  selector: 'app-gamesheet',
  imports: [BreadcrumbActionsDirective, ButtonComponent],
  templateUrl: './gamesheet.page.html',
  styleUrl: './gamesheet.page.scss',
})
export class GamesheetPage implements OnInit {
  private sanitizer = inject(DomSanitizer);
  private authService = inject(AuthService);
  private modalService = inject(ModalService);

  protected seasonId = signal<string | null>(null);

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
    this.modalService.openModal(SeasonIdModal, {
      name: 'SeasonID',
      icon: 'edit',
      showClose: !!this.seasonId(),
      data: { currentSeasonId: this.seasonId() },
      width: '500px',
      onCloseWithData: (data: unknown) => {
        this.seasonId.set(data as string | null);
      },
    });
  }
}
