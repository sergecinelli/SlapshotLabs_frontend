import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-gamesheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gamesheet.html',
  styleUrl: './gamesheet.scss',
})
export class GamesheetComponent {
  private sanitizer = inject(DomSanitizer);

  readonly gamesheetUrl: SafeResourceUrl;

  constructor() {
    const url = 'https://gamesheetstats.com/seasons/10711/standings?filter%5Bdivision%5D=59343';
    this.gamesheetUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}

