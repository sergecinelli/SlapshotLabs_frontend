import { IPageAccessMap, Role } from '../../services/roles/role.interface';
import { IVisibilityByRoleMap } from '../../shared/directives/component-visibility-by-role.directive';

export const goalieProfilePageRolesAccessMap: IPageAccessMap = {
  allowed: [Role.Admin, Role.Coach, Role.Player],
};

export const visibilityByRoleMap: IVisibilityByRoleMap = {
  show: {
    'edit-goalie-button': [Role.Admin, Role.CoachOfTeam],
  },
};
