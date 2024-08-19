export enum StatusCodes {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

export abstract class Constants {
  /** Identity-Server public-key certificate */
  static readonly JWKS_ENDPOINT = "/.well-known/openid-configuration/jwks";

  static readonly VELOPERA_HOST =
    process.env.VELOPERA_HOST || "env-not-set-https://velopera.voxel.at/ui";
}
