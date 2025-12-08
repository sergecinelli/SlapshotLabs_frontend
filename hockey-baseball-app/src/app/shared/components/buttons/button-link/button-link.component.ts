import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { ButtonBaseClass } from '../button-base.class';

@Component({
  selector: 'app-button-link',
  standalone: true,
  imports: [CommonModule, MatRippleModule, MatTooltipModule],
  templateUrl: './button-link.component.html',
  styleUrl: '../button.component.scss',
})
export class ButtonLinkComponent extends ButtonBaseClass {
  @Input() target: '_self' | '_blank' | '_parent' | '_top' = '_blank';
  @Input() link = '';

  private router = inject(Router);

  get resolvedLink(): string {
    if (!this.link) return '';
    return this.link.startsWith('http') ? this.link : 'https://' + this.link;
  }

  openUrl(event: MouseEvent) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey) return;

    event.preventDefault();

    const raw = this.link.trim();
    const hasProtocol = /^\w+:\/\//i.test(raw);
    const hasDomain = /^([a-z0-9-]+\.)+[a-z]{2,}($|\/)/i.test(raw);
    const isInternal = !hasProtocol && !hasDomain;

    if (isInternal) {
      const path = raw.startsWith('/') ? raw : `/${raw}`;
      const fullUrl = `${window.location.origin}${path}`;

      if (this.target && this.target !== '_self') {
        window.open(fullUrl, this.target);
      } else {
        this.router.navigateByUrl(path);
      }
      return;
    }

    const urlToOpen = hasProtocol ? raw : `https://${raw}`;
    window.open(urlToOpen, this.target);
  }
}

