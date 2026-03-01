import { Directive, ElementRef, AfterViewChecked, inject, input } from '@angular/core';
import { Role } from '../../services/roles/role.interface';
import { RoleService } from '../../services/roles/role.service';
import { AuthService } from '../../services/auth.service';

export interface IVisibilityByRoleMap {
  hide?: Record<string, Role[]>;
  show?: Record<string, Role[]>;
}

@Directive({
  selector: '[appVisibilityMap]',
})
export class ComponentVisibilityByRoleDirective implements AfterViewChecked {
  appVisibilityMap = input.required<IVisibilityByRoleMap>();

  private elementRef = inject(ElementRef);
  private roleService = inject(RoleService);
  private authService = inject(AuthService);

  ngAfterViewChecked() {
    this.init();
  }

  init() {
    const { hide, show } = this.appVisibilityMap();
    if (!hide && !show) return;

    const role = this.roleService.current;
    if (!this.appVisibilityMap()) return;

    const nodeList = this.elementRef.nativeElement.querySelectorAll('[role-visibility-name]');
    if (!nodeList) return;

    nodeList.forEach((el: HTMLElement) => {
      const roleName = el.getAttribute('role-visibility-name');
      if (!roleName) return;

      if (
        this.appVisibilityMap().show &&
        this.appVisibilityMap().show![roleName] &&
        this.appVisibilityMap().show![roleName].includes(Role.Author) &&
        this.authorCondition(el)
      ) {
        return;
      }

      if (
        this.appVisibilityMap().show &&
        this.appVisibilityMap().show![roleName] &&
        this.appVisibilityMap().show![roleName].includes(Role.CoachOfTeam) &&
        this.coachCondition(role, el)
      ) {
        return;
      }

      if (
        this.appVisibilityMap().hide &&
        this.appVisibilityMap().hide![roleName] &&
        this.appVisibilityMap().hide![roleName].includes(Role.Author) &&
        this.authorCondition(el)
      ) {
        el.remove();
        return;
      }

      if (
        this.appVisibilityMap().hide &&
        this.appVisibilityMap().hide![roleName] &&
        this.appVisibilityMap().hide![roleName].includes(Role.CoachOfTeam) &&
        this.coachCondition(role, el)
      ) {
        el.remove();
        return;
      }

      if (
        this.appVisibilityMap().hide &&
        this.appVisibilityMap().hide![roleName] &&
        this.appVisibilityMap().hide![roleName].includes(role)
      ) {
        el.remove();
        return;
      }

      if (
        this.appVisibilityMap().show &&
        this.appVisibilityMap().show![roleName] &&
        !this.appVisibilityMap().show![roleName].includes(role)
      ) {
        el.remove();
        return;
      }
    });
  }

  private coachCondition(roleName: Role, el: HTMLElement): boolean {
    if (roleName !== Role.Coach) return false;

    const teamIdAttr = el.getAttribute('role-visibility-team-id');
    if (teamIdAttr) {
      const currentUser = this.authService.getCurrentUserValue();
      const userTeamId = currentUser?.team_id?.toString() ?? '';

      if (!userTeamId || !teamIdAttr) {
        return false;
      }

      const teamIdArray = teamIdAttr.split(',');

      return teamIdArray.includes(userTeamId);
    }

    return false;
  }

  private authorCondition(el: HTMLElement): boolean {
    const authorIdAttr = el.getAttribute('role-visibility-author-id');
    if (authorIdAttr) {
      const currentUser = this.authService.getCurrentUserValue();
      const userAuthorId = currentUser?.id?.toString() ?? '';

      if (!userAuthorId || !authorIdAttr) {
        return false;
      }

      const authorIdArray = authorIdAttr.split(',');

      return authorIdArray.includes(userAuthorId);
    }

    return false;
  }
}
