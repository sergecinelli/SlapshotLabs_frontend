import { IPageAccessMap, Role } from '../../services/roles/role.interface';

export const goalieProfilePageRolesAccessMap: IPageAccessMap = {
    allowed: [Role.Admin, Role.Coach, Role.Player],
};
