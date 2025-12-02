import { Injectable, inject } from '@angular/core';
import { IPageAccessMap } from '../../services/roles/role.interface';
import { RoleService } from '../../services/roles/role.service';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  GuardResult,
  MaybeAsync,
  Router,
} from '@angular/router';
import { of, from } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RoleAccessGuard implements CanActivate {
  private router = inject(Router);
  private roleService = inject(RoleService);

  canActivate(route: ActivatedRouteSnapshot): MaybeAsync<GuardResult> {
    const pageAccess = route.data['pageRolesAccessMap'] as IPageAccessMap;

    if (!pageAccess) return of(true);

    if (
      pageAccess.allowed &&
      !pageAccess.allowed.find((role) => role === this.roleService.current)
    ) {
      // Redirect to dashboard if user doesn't have access
      return from(this.router.navigate(['/dashboard']));
    }

    if (
      pageAccess.denied &&
      pageAccess.denied.find((role) => role === this.roleService.current)
    ) {
      // Redirect to dashboard if user role is denied
      return from(this.router.navigate(['/dashboard']));
    }

    return of(true);
  }
}

