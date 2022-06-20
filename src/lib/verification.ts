export interface VerifiedMember {
  user: string;
  guild: string;
  nickname: string;
  roles: string[];
}

export enum ButtonId {
  APPROVE = 'approve',
  DENY = 'deny',
  VERIFY = 'verify',
}

export enum FieldName {
  NICKNAME = 'Nickname',
  USER_ID = 'User ID',
}

export enum ModalId {
  VERIFY = 'verify',
}

export enum InputId {
  NAME = 'name',
  PROGRAM = 'program',
  TEAM = 'team',
  EXPLANATION = 'explanation',
}
