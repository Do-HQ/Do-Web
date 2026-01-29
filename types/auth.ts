export interface UserType {
  email: string;
  firstname: string;
  lastnale: string;
}

export interface AuthData {
  email: string;
}

export interface GetOtpBody {
  email: string;
  intent: string;
}

export interface ValidateOtpBpdy {
  email: string;
  intent: string;
  code: string;
}
