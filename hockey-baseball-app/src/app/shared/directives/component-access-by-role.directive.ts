import { Directive, ElementRef, Input, AfterViewChecked, inject } from '@angular/core';
import { Role } from '../../services/roles/role.interface';
import { RoleService } from '../../services/roles/role.service';

export interface IAccessByRoleMap {
  enable?: Record<string, Role[]>;
  disable?: Record<string, Role[]>;
}

/**
 * Directive for disable or enable an element based on the user's role.
 *
 * @example
 * ```html
 * <div [appAccessMap]="accessByRoleMap">
 *  <custom-component role-access-name="media-team-admin">This block will be disable or enable for media-team-admin role.</custom-component>
 * </div>
 * ```
 *
 * @param {IAccessByRoleMap} accessMap - The map with roles which the block will be disable or enable.
 */
@Directive({
  selector: '[appAccessMap]',
  standalone: true,
})
export class ComponentAccessByRoleDirective implements AfterViewChecked {
  @Input() appAccessMap!: IAccessByRoleMap;
  @Input() opacity = 1;

  private elementRef = inject(ElementRef);
  private roleService = inject(RoleService);

  ngAfterViewChecked() {
    this.init();
  }

  init() {
    const { enable, disable } = this.appAccessMap;
    if (!enable && !disable) return;

    const role = this.roleService.current;
    if (!this.appAccessMap) return;

    const nodeList = this.elementRef.nativeElement.querySelectorAll('[role-access-name]');
    if (!nodeList) return;

    nodeList.forEach((el: HTMLElement) => {
      const roleName = el.getAttribute('role-access-name');
      if (!roleName) return;

      if (
        this.appAccessMap.disable &&
        this.appAccessMap.disable[roleName] &&
        this.appAccessMap.disable[roleName].includes(role)
      ) {
        el.style.opacity = String(this.opacity);
        el.style.userSelect = 'none';
        el.style.pointerEvents = 'none';

        return;
      }

      if (
        this.appAccessMap.enable &&
        this.appAccessMap.enable[roleName] &&
        !this.appAccessMap.enable[roleName].includes(role)
      ) {
        el.style.opacity = String(this.opacity);
        el.style.userSelect = 'none';
        el.style.pointerEvents = 'none';

        return;
      }
    });
  }
}

