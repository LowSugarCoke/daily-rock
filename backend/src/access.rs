// PRACTICE: Cloudflare Access JWT check (exercise 6 in docs/rust-learning-plan.md).
//
// Cloudflare Access sits in front of the app. After you sign in, it adds a
// signed token (a JWT) to every request in the `Cf-Access-Jwt-Assertion`
// header. Today the backend trusts every request. Make it check that token,
// so only you get in.
//
// Requirement:
// - Input: the request headers (`axum::http::HeaderMap`), Cloudflare's public
//   key (`jsonwebtoken::DecodingKey`), and which Access app the token must be
//   for: the team domain (for example `dailyrock.cloudflareaccess.com`) and the
//   app's audience tag (for example `daily-rock-aud`).
// - Output: the signed-in email (the token's `email` claim), or why the request
//   is not let in:
//   - no `Cf-Access-Jwt-Assertion` header: the token is missing;
//   - the token is not a JWT, is signed by another key, has another audience
//     (`aud`), or another issuer (`iss` is not `https://<team domain>`): the
//     token is invalid;
//   - the token's time is up (`exp` in the past): the token has expired.
// - The token is signed with RS256.
// - The `jsonwebtoken` crate is already in Cargo.toml: read its docs
//   (https://docs.rs/jsonwebtoken/10) for `decode` and `Validation`.
//
// The types, the signature and the tests below are written (on request).
// Write the body, until `cargo test access` passes. Then it gets a code review.

use axum::http::HeaderMap;
use jsonwebtoken::DecodingKey;

/// Which Cloudflare Access application the token must come from.
pub struct AccessConfig {
    /// The team domain, for example `dailyrock.cloudflareaccess.com`.
    pub team_domain: String,
    /// The application's audience (AUD) tag.
    pub audience: String,
}

/// Why a request was not let in.
#[derive(Debug, PartialEq, Eq)]
pub enum AccessError {
    /// The request has no Access token.
    MissingToken,
    /// The token is malformed, signed by another key, or for another app.
    InvalidToken,
    /// The token was valid once, but its time is up.
    Expired,
}

/// Checks the Access token in `headers` against `key` and `config`, and
/// returns the signed-in email.
pub fn verify_access(
    headers: &HeaderMap,
    key: &DecodingKey,
    config: &AccessConfig,
) -> Result<String, AccessError> {
    let _ = (headers, key, config);
    todo!("check the Cf-Access-Jwt-Assertion token")
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;
    use jsonwebtoken::{encode, get_current_timestamp, Algorithm, EncodingKey, Header};
    use serde_json::{json, Value};

    // Test-only RSA keys. `access` stands in for Cloudflare's signing key;
    // `other` is a key Cloudflare never used.
    const ACCESS_PRIVATE: &str = include_str!("../test-keys/access.pem");
    const ACCESS_PUBLIC: &str = include_str!("../test-keys/access.pub.pem");
    const OTHER_PRIVATE: &str = include_str!("../test-keys/other.pem");

    /// Cloudflare's public key for the test tokens.
    fn access_key() -> DecodingKey {
        DecodingKey::from_rsa_pem(ACCESS_PUBLIC.as_bytes()).unwrap()
    }

    /// Claims like the ones Cloudflare Access puts in a fresh token for the
    /// team `dailyrock.cloudflareaccess.com` and the app `daily-rock-aud`.
    /// Change a field (for example `claims["exp"] = json!(...)`) to break one rule.
    fn claims() -> Value {
        let now = get_current_timestamp();
        json!({
            "aud": ["daily-rock-aud"],
            "email": "you@example.com",
            "iss": "https://dailyrock.cloudflareaccess.com",
            "iat": now,
            "exp": now + 3600,
        })
    }

    /// Signs `claims` with RS256 using the given private key, giving a token.
    fn sign(private_pem: &str, claims: &Value) -> String {
        let key = EncodingKey::from_rsa_pem(private_pem.as_bytes()).unwrap();
        encode(&Header::new(Algorithm::RS256), claims, &key).unwrap()
    }

    /// Request headers carrying `token` in the Access header.
    fn headers_with(token: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(
            "cf-access-jwt-assertion",
            HeaderValue::from_str(token).unwrap(),
        );
        headers
    }

    fn config() -> AccessConfig {
        AccessConfig {
            team_domain: "dailyrock.cloudflareaccess.com".to_string(),
            audience: "daily-rock-aud".to_string(),
        }
    }

    /// Runs the check on a request carrying `token`.
    fn check(token: &str) -> Result<String, AccessError> {
        verify_access(&headers_with(token), &access_key(), &config())
    }

    #[test]
    fn valid_token_returns_email() {
        let token = sign(ACCESS_PRIVATE, &claims());
        assert_eq!(check(&token), Ok("you@example.com".to_string()));
    }

    #[test]
    fn missing_header_is_rejected() {
        let result = verify_access(&HeaderMap::new(), &access_key(), &config());
        assert_eq!(result, Err(AccessError::MissingToken));
    }

    #[test]
    fn garbage_token_is_invalid() {
        assert_eq!(check("not-a-jwt"), Err(AccessError::InvalidToken));
    }

    #[test]
    fn token_signed_by_another_key_is_invalid() {
        let token = sign(OTHER_PRIVATE, &claims());
        assert_eq!(check(&token), Err(AccessError::InvalidToken));
    }

    #[test]
    fn token_for_another_app_is_invalid() {
        let mut claims = claims();
        claims["aud"] = json!(["someone-elses-app"]);
        let token = sign(ACCESS_PRIVATE, &claims);
        assert_eq!(check(&token), Err(AccessError::InvalidToken));
    }

    #[test]
    fn token_from_another_team_is_invalid() {
        let mut claims = claims();
        claims["iss"] = json!("https://evil.cloudflareaccess.com");
        let token = sign(ACCESS_PRIVATE, &claims);
        assert_eq!(check(&token), Err(AccessError::InvalidToken));
    }

    #[test]
    fn expired_token_is_rejected() {
        let mut claims = claims();
        claims["exp"] = json!(get_current_timestamp() - 3600);
        let token = sign(ACCESS_PRIVATE, &claims);
        assert_eq!(check(&token), Err(AccessError::Expired));
    }
}
