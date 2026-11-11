export interface FormerMember {
  user: string;
  guild: string;
  nickname: string;
  roles: string[];
  leftAt: Date;
}

export enum ButtonId {
  Approve = "approve",
  Deny = "deny",
  Verify = "verify",
}

export enum FieldName {
  Nickname = "Nickname",
  UserId = "User ID",
  Program = "Program",
  Team = "Team Number",
  AgeConfirmation = "13+ Confirmation",
}

export enum ModalId {
  Verify = "verify",
}

export enum InputId {
  Name = "name",
  Program = "program",
  Team = "team",
  Explanation = "explanation",
  AgeConfirmation = "age-confirmation",
}
