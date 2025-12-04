import { IPageAccessMap, Role } from '../../services/roles/role.interface';
import { IAccessByRoleMap } from '../../shared/directives/component-access-by-role.directive';

export const analyticsPageRolesAccessMap: IPageAccessMap = {
  allowed: [Role.Admin, Role.Coach, Role.Player],
};

export const accessByRoleMap: IAccessByRoleMap = {};

