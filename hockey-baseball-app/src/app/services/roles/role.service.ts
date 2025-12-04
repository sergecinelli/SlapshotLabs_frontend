import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { Role } from './role.interface';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private authService = inject(AuthService);

  get current(): Role {
    const user = this.authService.getCurrentUserValue();
    if (!user || !user.role_id) return Role.Unknown;

    return this.mapRoleNameToRole(user.role_id);
  }

  /**
   * Convert role_name from API to Role enum
   */
  mapRoleNameToRole(roleName: number): Role {
    switch (roleName) {
      case 1: return Role.Admin;
      case 2: return Role.Coach;
      case 3: return Role.Player;
    }

    return Role.Unknown;
  }
}

