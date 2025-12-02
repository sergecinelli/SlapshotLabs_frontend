import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { Role } from './role.interface';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private authService = inject(AuthService);

  get current(): Role {
    const user = this.authService.getCurrentUserValue();
    if (!user || !user.role_name) return Role.Unknown;

    return this.mapRoleNameToRole(user.role_name);
  }

  get currentRoleName(): string {
    const user = this.authService.getCurrentUserValue();
    return user?.role_name || '';
  }

  get currentRoleId(): number | null {
    const user = this.authService.getCurrentUserValue();
    return user?.role_id || null;
  }

  /**
   * Convert role_name from API to Role enum
   */
  mapRoleNameToRole(roleName: string): Role {
    const normalizedName = roleName.toLowerCase().trim();

    switch (normalizedName) {
      case 'admin':
        return Role.Admin;
      case 'coach':
        return Role.Coach;
      case 'player':
        return Role.Player;
      default:
        return Role.Unknown;
    }
  }
}

