import { IPageAccessMap, Role } from '../../services/roles/role.interface';
import { IVisibilityByRoleMap } from '../../shared/directives/component-visibility-by-role.directive';

export const playerProfilePageRolesAccessMap: IPageAccessMap = {
    allowed: [Role.Admin, Role.Coach, Role.Player],
};

export const visibilityByRoleMap: IVisibilityByRoleMap = {
    show: {
        'edit-player-button': [Role.Admin, Role.Coach],
    },
};