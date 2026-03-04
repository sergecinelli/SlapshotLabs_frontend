import { IPageAccessMap, Role } from '../../services/roles/role.interface';
import { IVisibilityByRoleMap } from '../../shared/directives/component-visibility-by-role.directive';

export const tryoutPageRolesAccessMap: IPageAccessMap = {
  allowed: [Role.Admin, Role.Coach, Role.Player],
};

export const visibilityByRoleMap: IVisibilityByRoleMap = {
  show: {
    'add-player-button': [Role.Admin, Role.Coach],
    'delete-action': [Role.Admin, Role.Coach],
  },
};
