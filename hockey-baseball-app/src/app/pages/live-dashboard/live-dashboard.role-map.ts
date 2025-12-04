import { IPageAccessMap, Role } from '../../services/roles/role.interface';
import { IVisibilityByRoleMap } from '../../shared/directives/component-visibility-by-role.directive';

export const liveDashboardPageRolesAccessMap: IPageAccessMap = {
    allowed: [Role.Admin, Role.Coach, Role.Player],
};

export const visibilityByRoleMap: IVisibilityByRoleMap = {
    show: {
        'add-event-button': [Role.Admin, Role.CoachOfTeam],
        'edit-event-button': [Role.Admin, Role.CoachOfTeam],
        'delete-event-button': [Role.Admin, Role.CoachOfTeam],
    },
};