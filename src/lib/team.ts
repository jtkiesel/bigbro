export interface Coordinates {
  lat: number;
  lon: number;
}

export enum Grade {
  COLLEGE = "College",
  HIGH_SCHOOL = "High School",
  MIDDLE_SCHOOL = "Middle School",
  ELEMENTARY_SCHOOL = "Elementary School",
}

export interface IdInfo {
  id: number;
  name: string;
  code: string;
}

export interface Location {
  venue: string | null;
  address_1: string;
  address_2: string | null;
  city: string;
  region: string | null;
  postcode: string;
  country: string;
  coordinates: Coordinates;
}

export interface Team {
  id: number;
  number: string;
  team_name: string;
  robot_name: string | null;
  organization: string | null;
  location: Location;
  registered: boolean;
  program: IdInfo;
  grade: Grade;
}
