import { Component, inject, input, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ModalService } from '../../../services/modal.service';
import { ButtonSmallComponent } from '../buttons/button-small/button-small.component';

@Component({
  selector: 'app-clickable-link',
  imports: [RouterLink, ButtonSmallComponent],
  templateUrl: './clickable-link.component.html',
  styleUrl: './clickable-link.component.scss',
  host: {
    '[class.has-link-icon]': 'linkIcon()',
    '[class.has-icon]': '!!icon()',
    '[class.is-flex]': 'flex()',
    '[style.font-size]': 'fontSize()',
    '[style.font-weight]': 'fontWeight()',
    '[style.color]': 'cssColor()',
  },
})
export class ClickableLinkComponent {
  private router = inject(Router);
  private modalService = inject(ModalService);

  route = input.required<string | unknown[]>();
  linkIcon = input(false);
  linkIconTooltip = input('');
  icon = input<string | null>(null);
  iconPosition = input<'before' | 'after'>('before');
  ariaLabel = input<string | null>(null);
  closeModals = input(false);
  fontSize = input<string | null>(null);
  fontWeight = input<string | null>(null);
  color = input<string | null>(null);
  flex = input(false);

  protected cssColor = computed(() => {
    const c = this.color();
    return c ? `var(--${c.replaceAll('_', '-')})` : null;
  });

  onLinkClick(): void {
    if (this.closeModals()) {
      this.modalService.closeAll();
    }
  }

  onLinkIconClick(): void {
    if (this.closeModals()) {
      this.modalService.closeAll();
    }
    const route = this.route();
    this.router.navigate(Array.isArray(route) ? (route as string[]) : [route]);
  }
}
