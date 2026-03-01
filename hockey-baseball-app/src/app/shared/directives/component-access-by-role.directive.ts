import { Directive, ElementRef, AfterViewChecked, inject, input } from '@angular/core';
import { Role } from '../../services/roles/role.interface';
import { RoleService } from '../../services/roles/role.service';
import { AuthService } from '../../services/auth.service';

export interface IAccessByRoleMap {
  enable?: Record<string, Role[]>;
  disable?: Record<string, Role[]>;
}

@Directive({
  selector: '[appAccessMap]',
})
export class ComponentAccessByRoleDirective implements AfterViewChecked {
  appAccessMap = input.required<IAccessByRoleMap>();
  opacity = input(0.7);

  private elementRef = inject(ElementRef);
  private roleService = inject(RoleService);
  private authService = inject(AuthService);

  ngAfterViewChecked() {
    this.init();
  }

  init() {
    const { enable, disable } = this.appAccessMap();
    if (!enable && !disable) return;

    const role = this.roleService.current;
    if (!this.appAccessMap()) return;

    const nodeList = this.elementRef.nativeElement.querySelectorAll('[role-access-name]');
    if (!nodeList) return;

    nodeList.forEach((el: HTMLElement) => {
      const roleName = el.getAttribute('role-access-name');
      if (!roleName) return;

      if (
        this.appAccessMap().enable &&
        this.appAccessMap().enable![roleName] &&
        this.appAccessMap().enable![roleName].includes(Role.Author) &&
        this.authorCondition(el)
      ) {
        return;
      }

      if (
        this.appAccessMap().enable &&
        this.appAccessMap().enable![roleName] &&
        this.appAccessMap().enable![roleName].includes(Role.Coach) &&
        this.coachCondition(el)
      ) {
        return;
      }

      if (
        this.appAccessMap().disable &&
        this.appAccessMap().disable![roleName] &&
        this.appAccessMap().disable![roleName].includes(Role.Author) &&
        this.authorCondition(el)
      ) {
        el.style.opacity = String(this.opacity());
        el.style.userSelect = 'none';
        el.style.pointerEvents = 'none';
        return;
      }

      if (
        this.appAccessMap().disable &&
        this.appAccessMap().disable![roleName] &&
        this.appAccessMap().disable![roleName].includes(Role.Coach) &&
        this.coachCondition(el)
      ) {
        el.style.opacity = String(this.opacity());
        el.style.userSelect = 'none';
        el.style.pointerEvents = 'none';
        return;
      }

      if (
        this.appAccessMap().disable &&
        this.appAccessMap().disable![roleName] &&
        this.appAccessMap().disable![roleName].includes(role)
      ) {
        el.style.opacity = String(this.opacity());
        el.style.userSelect = 'none';
        el.style.pointerEvents = 'none';

        return;
      }

      if (
        this.appAccessMap().enable &&
        this.appAccessMap().enable![roleName] &&
        !this.appAccessMap().enable![roleName].includes(role)
      ) {
        el.style.opacity = String(this.opacity());
        el.style.userSelect = 'none';
        el.style.pointerEvents = 'none';

        return;
      }
    });
  }

  private coachCondition(el: HTMLElement): boolean {
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
