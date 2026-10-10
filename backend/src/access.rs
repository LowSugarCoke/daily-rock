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
// This week you do all of it:
// 1. The `pub` types (the app's settings, the error) and the `pub fn` signature.
// 2. The tests in the `tests` module below, written first, one per rule above.
//    The helpers there make signed test tokens for you.
// 3. The body, until `cargo test access` passes. Then it gets a code review.

#[cfg(test)]
mod tests {
    use axum::http::{HeaderMap, HeaderValue};
    use jsonwebtoken::{
        encode, get_current_timestamp, Algorithm, DecodingKey, EncodingKey, Header,
    };
    use serde_json::{json, Value};

    // Test-only RSA keys. `access` stands in for Cloudflare's signing key;
    // `other` is a key Cloudflare never used.
    const ACCESS_PRIVATE: &str = include_str!("../test-keys/access.pem");
    const ACCESS_PUBLIC: &str = include_str!("../test-keys/access.pub.pem");
    #[allow(dead_code)]
    const OTHER_PRIVATE: &str = include_str!("../test-keys/other.pem");

    /// Cloudflare's public key for the test tokens.
    #[allow(dead_code)]
    fn access_key() -> DecodingKey {
        DecodingKey::from_rsa_pem(ACCESS_PUBLIC.as_bytes()).unwrap()
    }

    /// Claims like the ones Cloudflare Access puts in a fresh token for the
    /// team `dailyrock.cloudflareaccess.com` and the app `daily-rock-aud`.
    /// Change a field (for example `claims["exp"] = json!(...)`) to break one rule.
    #[allow(dead_code)]
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
    #[allow(dead_code)]
    fn sign(private_pem: &str, claims: &Value) -> String {
        let key = EncodingKey::from_rsa_pem(private_pem.as_bytes()).unwrap();
        encode(&Header::new(Algorithm::RS256), claims, &key).unwrap()
    }

    /// Request headers carrying `token` in the Access header.
    #[allow(dead_code)]
    fn headers_with(token: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(
            "cf-access-jwt-assertion",
            HeaderValue::from_str(token).unwrap(),
        );
        headers
    }

    #[test]
    fn helpers_make_a_signed_token() {
        let token = sign(ACCESS_PRIVATE, &claims());
        assert_eq!(token.split('.').count(), 3);
        assert!(headers_with(&token).contains_key("cf-access-jwt-assertion"));
    }
}
