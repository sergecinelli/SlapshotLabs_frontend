import { IPageAccessMap, Role } from '../../services/roles/role.interface';
import { IVisibilityByRoleMap } from '../../shared/directives/component-visibility-by-role.directive';

export const gameAnalysisPageRolesAccessMap: IPageAccessMap = {
  allowed: [Role.Admin, Role.Coach, Role.Player],
};

export const visibilityByRoleMap: IVisibilityByRoleMap = {
  show: {
    'create-analysis-button': [Role.Admin],
    'edit-action': [Role.Admin],
    'delete-action': [Role.Admin, Role.Author],
  },
};
