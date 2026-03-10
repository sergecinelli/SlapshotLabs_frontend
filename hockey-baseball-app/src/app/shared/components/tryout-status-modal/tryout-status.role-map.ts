import { Role } from '../../../services/roles/role.interface';
import { TryoutStatus } from '../../interfaces/tryout.interface';

export const statusAccessByRole: Partial<Record<Role, TryoutStatus[]>> = {
  [Role.Admin]: [TryoutStatus.MadeTeam, TryoutStatus.Cut],
  [Role.Coach]: [TryoutStatus.MadeTeam, TryoutStatus.Cut],
  [Role.Player]: [TryoutStatus.TryingOut],
};
