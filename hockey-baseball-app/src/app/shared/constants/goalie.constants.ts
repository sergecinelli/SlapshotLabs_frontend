export interface DefaultGoalieName {
  firstName: string;
  lastName: string;
}

export const DEFAULT_GOALIE_NAME: DefaultGoalieName = {
  firstName: 'No',
  lastName: 'Goalie',
};

export function isDefaultGoalieName(firstName?: string, lastName?: string): boolean {
  return (
    (firstName || '').trim().toLowerCase() === DEFAULT_GOALIE_NAME.firstName.toLowerCase() &&
    (lastName || '').trim().toLowerCase() === DEFAULT_GOALIE_NAME.lastName.toLowerCase()
  );
}
