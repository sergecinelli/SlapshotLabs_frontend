import { IPageAccessMap, Role } from '../../services/roles/role.interface';
import { IVisibilityByRoleMap } from '../../shared/directives/component-visibility-by-role.directive';

export const videoHighlightsPageRolesAccessMap: IPageAccessMap = {
  allowed: [Role.Admin, Role.Coach, Role.Player],
};

export const visibilityByRoleMap: IVisibilityByRoleMap = {
  show: {
    'create-highlight-button': [Role.Admin, Role.Coach, Role.Player],
    'edit-action': [Role.Admin, Role.Author],
    'delete-action': [Role.Admin, Role.Author],
  },
};