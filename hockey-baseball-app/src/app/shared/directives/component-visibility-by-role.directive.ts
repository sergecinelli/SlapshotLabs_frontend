import { Directive, ElementRef, Input, AfterViewChecked, inject } from '@angular/core';
import { Role } from '../../services/roles/role.interface';
import { RoleService } from '../../services/roles/role.service';
import { AuthService } from '../../services/auth.service';

export interface IVisibilityByRoleMap {
  hide?: Record<string, Role[]>;
  show?: Record<string, Role[]>;
}

/**
 * Directive for displaying or hiding an element based on the user's role.
 *
 * @example
 * ```html
 * <div [appVisibilityMap]="visibilityByRoleMap">
 *  <custom-component role-visibility-name="media-team-admin">This block will be visible or hided for media-team-admin role.</custom-component>
 * </div>
 * ```
 *
 * @param {IVisibilityByRoleMap} visibilityMap - The map with roles which the block will be displayed or hided.
 */
@Directive({
  selector: '[appVisibilityMap]',
  standalone: true,
})
export class ComponentVisibilityByRoleDirective implements AfterViewChecked {
  @Input() appVisibilityMap!: IVisibilityByRoleMap;

  private elementRef = inject(ElementRef);
  private roleService = inject(RoleService);
  private authService = inject(AuthService);

  ngAfterViewChecked() {
    this.init();
  }

  init() {
    const { hide, show } = this.appVisibilityMap;
    if (!hide && !show) return;

    const role = this.roleService.current;
    if (!this.appVisibilityMap) return;

    const nodeList = this.elementRef.nativeElement.querySelectorAll('[role-visibility-name]');
    if (!nodeList) return;

    nodeList.forEach((el: HTMLElement) => {
      const roleName = el.getAttribute('role-visibility-name');
      if (!roleName) return;

      // Check show for Author role and author_id condition
      if (
        this.appVisibilityMap.show &&
        this.appVisibilityMap.show[roleName] &&
        this.appVisibilityMap.show[roleName].includes(Role.Author) &&
        this.authorCondition(el)
      ) {
        return;
      }

      // Check show for Coach role and team_id condition
      if (
        this.appVisibilityMap.show &&
        this.appVisibilityMap.show[roleName] &&
        this.appVisibilityMap.show[roleName].includes(Role.CoachOfTeam) &&
        this.coachCondition(role, el)
      ) {
        return;
      }

      // Check hide for Author role and author_id condition
      if (
        this.appVisibilityMap.hide &&
        this.appVisibilityMap.hide[roleName] &&
        this.appVisibilityMap.hide[roleName].includes(Role.Author) &&
        this.authorCondition(el)
      ) {
        el.remove();
        return;
      }

      // Check hide for Coach role and team_id condition
      if (
        this.appVisibilityMap.hide &&
        this.appVisibilityMap.hide[roleName] &&
        this.appVisibilityMap.hide[roleName].includes(Role.CoachOfTeam) &&
        this.coachCondition(role, el)
      ) {
        el.remove();
        return;
      }

      // Check hide for role
      if (
        this.appVisibilityMap.hide &&
        this.appVisibilityMap.hide[roleName] &&
        this.appVisibilityMap.hide[roleName].includes(role)
      ) {
        el.remove();
        return;
      }

      // Check show for role
      if (
        this.appVisibilityMap.show &&
        this.appVisibilityMap.show[roleName] &&
        !this.appVisibilityMap.show[roleName].includes(role)
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

      // Compare team_id from attribute with user's team_id
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

      // Compare author_id from attribute with user's author_id
      const authorIdArray = authorIdAttr.split(',');

      return authorIdArray.includes(userAuthorId);
    }

    return false;
  }
}
