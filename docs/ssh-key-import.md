# SSH key replacement

Fleet uses one central SSH key for new connections. Importing a key replaces that key locally; it does not distribute the new public key to hosts or remove the old key from their authorized_keys files. Intended-use assignments are not a scan of remote trust.

Before replacing the key, prepare access using the new public key and retain a protected recovery copy of the old key. Hosts that do not trust the new key can become unreachable from Fleet. Existing connections may remain open with their previously negotiated session; they do not demonstrate that a new connection will succeed.

The import dialog first validates the selected file and displays the current and candidate fingerprints. Its preparation section exposes the derived public key for copying to remote accounts before activation. The activation request is bound to both identities. A changed active key or candidate requires a new preview. The file limit is 64 KiB.

## API

Both endpoints require administrator access and share a bounded attempt limiter with private-key export.

1. POST `/api/system/key/import-preview` with `privateKey` and optional `passphrase`. The response contains `candidate.fingerprint`, `candidate.algorithm` and the current key's public identity, or `current: null`. It does not activate or return a private key.
2. POST `/api/system/key/import` with the same key/passphrase, `expectedKeyId` from `current.id` (explicit null if absent), and `expectedFingerprint` from the candidate. Missing review bindings return 428. A changed identity returns 409 and requires a new preview.

Validation uses a new private temporary directory. Activation validates the candidate again and stores it at a unique path. The active database record and import audit commit together. The audit retains previous/new key IDs, names, algorithms and fingerprints, without private key material or file paths; ordinary failures preserve the previous active key. Old managed files are removed after commit. This is not a coordinated remote rotation or a power-loss recovery protocol.

Private-key export separately requires current account `password` and enabled-MFA `code`, in addition to the optional output `passphrase`.
