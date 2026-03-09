import { Component, OnInit, OnDestroy, signal, viewChild, ElementRef, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-theme-transition',
  templateUrl: './theme-transition.component.html',
  styleUrl: './theme-transition.component.scss',
})
export class ThemeTransitionComponent implements OnInit, OnDestroy {
  private themeService = inject(ThemeService);

  isTransitioning = signal(false);
  transitionDirection = signal<'light-to-dark' | 'dark-to-light'>('light-to-dark');

  transitionCurtain = viewChild<ElementRef<HTMLDivElement>>('transitionCurtain');

  private transitionStartSub: Subscription | null = null;
  private themeChangedSub: Subscription | null = null;
  private currentAnimation: Animation | null = null;
  private clickX = 0;
  private clickY = 0;

  ngOnInit(): void {
    this.transitionStartSub = this.themeService.themeTransitionStart$.subscribe(({ x, y }) => {
      this.clickX = x;
      this.clickY = y;
      this.transitionDirection.set(this.themeService.isDark() ? 'light-to-dark' : 'dark-to-light');
      this.isTransitioning.set(true);
      document.documentElement.classList.add('theme-transitioning');
    });

    this.themeChangedSub = this.themeService.themeChanged$.subscribe(() => {
      if (!this.isTransitioning()) return;

      requestAnimationFrame(() => {
        const curtain = this.transitionCurtain()?.nativeElement;
        if (!curtain) {
          this.cleanup();
          return;
        }
        this.runExpandAnimation(curtain);
      });
    });
  }

  ngOnDestroy(): void {
    this.transitionStartSub?.unsubscribe();
    this.themeChangedSub?.unsubscribe();
    this.cancelAnimation();
  }

  private runExpandAnimation(curtain: HTMLDivElement): void {
    this.cancelAnimation();

    this.currentAnimation = curtain.animate(
      [
        { clipPath: `circle(0% at ${this.clickX}px ${this.clickY}px)` },
        { clipPath: `circle(150% at ${this.clickX}px ${this.clickY}px)` },
      ],
      {
        duration: 500,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards',
      }
    );

    this.currentAnimation.onfinish = () => {
      this.runContractAnimation(curtain);
    };
  }

  private runContractAnimation(curtain: HTMLDivElement): void {
    this.currentAnimation = curtain.animate(
      [
        { clipPath: `circle(150% at ${this.clickX}px ${this.clickY}px)` },
        { clipPath: `circle(0% at ${this.clickX}px ${this.clickY}px)` },
      ],
      {
        duration: 300,
        easing: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
        fill: 'forwards',
      }
    );

    this.currentAnimation.onfinish = () => {
      this.cleanup();
    };
  }

  private cancelAnimation(): void {
    if (this.currentAnimation) {
      this.currentAnimation.cancel();
      this.currentAnimation = null;
    }
  }

  private cleanup(): void {
    this.cancelAnimation();
    this.isTransitioning.set(false);
    document.documentElement.classList.remove('theme-transitioning');
  }
}
