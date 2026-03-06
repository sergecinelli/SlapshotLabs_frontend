import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { routeTransition } from './shared/animations/route.animations';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  animations: [routeTransition],
})
export class AppComponent {
  protected readonly title = signal('hockey-baseball-app');

  getRouteAnimationData(outlet: RouterOutlet) {
    return outlet?.activatedRouteData?.['animation'];
  }
}
