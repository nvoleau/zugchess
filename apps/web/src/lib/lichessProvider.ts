import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

export interface LichessProfile {
  id: string;
  username: string;
  email?: string;
}

/**
 * Provider OAuth générique pour "Se connecter avec Lichess" (PKCE, pas de endpoint OIDC standard).
 * Doc : https://lichess.org/api#tag/OAuth
 */
export function Lichess(config: OAuthUserConfig<LichessProfile>): OAuthConfig<LichessProfile> {
  return {
    ...config,
    id: "lichess",
    name: "Lichess",
    type: "oauth",
    checks: ["pkce", "state"],
    authorization: {
      url: "https://lichess.org/oauth",
      params: { scope: "email:read" },
    },
    token: "https://lichess.org/api/token",
    userinfo: "https://lichess.org/api/account",
    // Lichess attend client_id + client_secret dans le corps du POST (pas en Basic auth).
    client: { token_endpoint_auth_method: "client_secret_post" },
    profile(profile) {
      return {
        id: profile.id,
        name: profile.username,
        email: profile.email ?? null,
        image: null,
      };
    },
  };
}
