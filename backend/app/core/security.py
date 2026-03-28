import base64
import hashlib
import hmac
import secrets


PBKDF2_ITERATIONS = 600_000
HASH_NAME = "sha256"
SALT_BYTES = 16


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(SALT_BYTES)
    derived_key = hashlib.pbkdf2_hmac(
        HASH_NAME,
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    encoded_salt = base64.b64encode(salt).decode("ascii")
    encoded_hash = base64.b64encode(derived_key).decode("ascii")
    return f"pbkdf2_{HASH_NAME}${PBKDF2_ITERATIONS}${encoded_salt}${encoded_hash}"


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False

    try:
        algorithm, iteration_text, encoded_salt, encoded_hash = password_hash.split("$", maxsplit=3)
        iterations = int(iteration_text)
        salt = base64.b64decode(encoded_salt.encode("ascii"))
        expected_hash = base64.b64decode(encoded_hash.encode("ascii"))
    except (ValueError, TypeError):
        return False

    if algorithm != f"pbkdf2_{HASH_NAME}":
        return False

    candidate_hash = hashlib.pbkdf2_hmac(
        HASH_NAME,
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return hmac.compare_digest(candidate_hash, expected_hash)
