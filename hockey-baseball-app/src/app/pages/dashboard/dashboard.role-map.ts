import { IPageAccessMap, Role } from '../../services/roles/role.interface';
import { IVisibilityByRoleMap } from '../../shared/directives/component-visibility-by-role.directive';

export const dashboardPageRolesAccessMap: IPageAccessMap = {
    allowed: [Role.Admin, Role.Coach, Role.Player],
};

export const visibilityByRoleMap: IVisibilityByRoleMap = {
    show: {
        'add-team-button': [Role.Admin],
        'add-player-button': [Role.Admin, Role.Coach],
        'add-goalie-button': [Role.Admin, Role.Coach],
        'add-game-button': [Role.Admin],
        'add-highlight-button': [Role.Admin, Role.Coach, Role.Player],
    },
};