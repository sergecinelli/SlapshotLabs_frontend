import { IPageAccessMap, Role } from '../../services/roles/role.interface';
import { IVisibilityByRoleMap } from '../../shared/directives/component-visibility-by-role.directive';

export const goaliesPageRolesAccessMap: IPageAccessMap = {
    allowed: [Role.Admin, Role.Coach, Role.Player],
};

export const visibilityByRoleMap: IVisibilityByRoleMap = {
    show: {
        'add-goalie-button': [Role.Admin, Role.CoachOfTeam],
        'edit-action': [Role.Admin, Role.CoachOfTeam],
        'delete-action': [Role.Admin, Role.CoachOfTeam],
    },
};