#!/bin/sh
# Initialize persistent storage, then run the application without root privileges.
set -eu

fail() { echo "[INIT] $*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || fail "Start the container as root; the entrypoint drops to shipyard after initialization."
[ -n "${JWT_SECRET:-}" ] || fail "JWT_SECRET must be set."
[ -n "${SHIPYARD_KEY_SECRET:-}" ] || fail "SHIPYARD_KEY_SECRET must be set."
[ "$JWT_SECRET" != "$SHIPYARD_KEY_SECRET" ] || fail "JWT_SECRET and SHIPYARD_KEY_SECRET must be different."

case "${SHIPYARD_RENEW_CERT:-0}" in 0|1) ;; *) fail "SHIPYARD_RENEW_CERT must be 0 or 1." ;; esac
if { [ -n "${SSL_KEY:-}" ] && [ -z "${SSL_CERT:-}" ]; } ||
   { [ -z "${SSL_KEY:-}" ] && [ -n "${SSL_CERT:-}" ]; }; then
  fail "Set SSL_KEY and SSL_CERT together, or leave both unset."
fi
if [ -n "${SSL_KEY:-}" ] && [ "${SHIPYARD_RENEW_CERT:-0}" = 1 ]; then
  fail "SHIPYARD_RENEW_CERT only renews generated certificates; manage custom certificates externally."
fi

# Only explicitly configured workspace roots need ownership repair. Never use
# the application-writable legacy tofu-workspace-paths.txt as a root command list.
repair_workspaces() {
  roots=${OPENTOFU_WORKSPACE_ROOTS:-/workspaces}
  previous_ifs=$IFS
  IFS=,
  set -f
  root_count=0
  for configured_root in $roots; do
    workspace_root=$(printf '%s' "$configured_root" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [ -n "$workspace_root" ] || fail "Workspace roots cannot be empty."
    case "$workspace_root" in /*) ;; *) fail "Workspace roots must be absolute paths." ;; esac
    workspace_root=$(realpath -m -- "$workspace_root")
    case "$workspace_root" in
      /|/app|/app/*|/etc|/etc/*|/usr|/usr/*|/var|/var/*|/home|/home/*|/root|/root/*|/proc|/proc/*|/sys|/sys/*|/dev|/dev/*|/bin|/sbin|/lib|/lib64|/tmp|/mnt|/media|/opt|/srv)
        fail "Refusing ownership repair of protected workspace root: $workspace_root" ;;
    esac
    mkdir -p -- "$workspace_root"
    # Do not follow symlinks inside a workspace into unrelated mounted paths.
    chown -hR shipyard:shipyard -- "$workspace_root"
    root_count=$((root_count + 1))
  done
  set +f
  IFS=$previous_ifs
  [ "$root_count" -gt 0 ] || fail "At least one workspace root is required."
}
repair_workspaces

CERT_DIR=/app/server/data/certs
DEFAULT_KEY="$CERT_DIR/shipyard.key"
DEFAULT_CERT="$CERT_DIR/shipyard.crt"
cert_temp=
cleanup() {
  if [ -n "$cert_temp" ]; then rm -rf -- "$cert_temp"; fi
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM

validate_certificate() {
  openssl x509 -in "$1" -noout -checkend 0 >/dev/null || fail "Certificate is unreadable or expired. Renew it before starting."
  openssl x509 -in "$1" -noout -pubkey -out "$cert_temp/cert.pub"
  openssl pkey -in "$2" -passin pass: -pubout -out "$cert_temp/key.pub"
  cmp -s "$cert_temp/cert.pub" "$cert_temp/key.pub" || fail "TLS certificate and private key do not match."
}

mkdir -p "$CERT_DIR"
cert_temp=$(mktemp -d "$CERT_DIR/.prepare.XXXXXX")
if [ -z "${SSL_KEY:-}" ]; then
  renew=${SHIPYARD_RENEW_CERT:-0}
  if [ "$renew" = 1 ] || { [ ! -e "$DEFAULT_KEY" ] && [ ! -e "$DEFAULT_CERT" ]; }; then
    SANS="DNS:shipyard,DNS:localhost,IP:127.0.0.1"
    # Keep generated names stable across container recreation. Add all addresses
    # used by agents explicitly through CERT_SANS instead of container IPs.
    [ -z "${CERT_SANS:-}" ] || SANS="$SANS,$CERT_SANS"
    echo "[HTTPS] Generating self-signed certificate"
    openssl req -x509 -nodes -days 3650 -newkey rsa:4096 \
      -keyout "$cert_temp/shipyard.key" -out "$cert_temp/shipyard.crt" \
      -subj /CN=shipyard -addext "subjectAltName=$SANS"
    chmod 600 "$cert_temp/shipyard.key"
    validate_certificate "$cert_temp/shipyard.crt" "$cert_temp/shipyard.key"
    if [ -e "$DEFAULT_KEY" ] || [ -e "$DEFAULT_CERT" ]; then
      previous_cert=$(mktemp -d "$CERT_DIR/previous.XXXXXX")
      [ ! -e "$DEFAULT_KEY" ] || cp -p "$DEFAULT_KEY" "$previous_cert/shipyard.key"
      [ ! -e "$DEFAULT_CERT" ] || cp -p "$DEFAULT_CERT" "$previous_cert/shipyard.crt"
      echo "[HTTPS] Previous TLS files preserved in $previous_cert"
    fi
    mv "$cert_temp/shipyard.key" "$DEFAULT_KEY"
    mv "$cert_temp/shipyard.crt" "$DEFAULT_CERT"
  fi
  [ -f "$DEFAULT_KEY" ] && [ -f "$DEFAULT_CERT" ] || fail "Incomplete generated TLS pair. Restore it or explicitly set SHIPYARD_RENEW_CERT=1."
  validate_certificate "$DEFAULT_CERT" "$DEFAULT_KEY"
  openssl x509 -in "$DEFAULT_CERT" -noout -ext subjectAltName > "$cert_temp/sans"
  grep -Eq 'DNS:|IP Address:' "$cert_temp/sans" || fail "Generated certificate lacks SANs. Set SHIPYARD_RENEW_CERT=1 to renew it."
  chmod 600 "$DEFAULT_KEY"
  export SSL_KEY="$DEFAULT_KEY" SSL_CERT="$DEFAULT_CERT"
else
  validate_certificate "$SSL_CERT" "$SSL_KEY"
fi
cleanup
cert_temp=

mkdir -p /app/server/data/bin /app/server/playbooks /app/plugins
chown -hR shipyard:shipyard /app/server/data /app/server/playbooks /app/plugins

# Retire old installations without deleting operator files. Archival is a
# one-time move; subsequent starts find no legacy source to move again.
archive_legacy() {
  legacy_source=$1
  if [ -e "$legacy_source" ] || [ -L "$legacy_source" ]; then
    mkdir -p /app/server/data/legacy-migrations
    legacy_archive=$(mktemp -d /app/server/data/legacy-migrations/startup.XXXXXX)
    mv -- "$legacy_source" "$legacy_archive/"
    chown -hR shipyard:shipyard "$legacy_archive"
    echo "[migration] Preserved $legacy_source in $legacy_archive"
  fi
}
archive_legacy /app/plugins/opentofu
archive_legacy /app/server/playbooks/system

# Internal playbooks run exclusively from the image's bundled-playbooks tree.
if [ -d /app/bundled-playbooks ]; then
  yml_count=$(find /app/server/playbooks -maxdepth 1 -type f \( -name '*.yml' -o -name '*.yaml' \) | wc -l)
  if [ "$yml_count" -eq 0 ]; then
    echo "[INIT] Seeding starter playbooks"
    for f in /app/bundled-playbooks/*.yml /app/bundled-playbooks/*.yaml; do
      [ -f "$f" ] || continue
      bn=$(basename "$f")
      case "$bn" in update.yml|gather-docker.yml|check-image-updates.yml|reboot.yml|setup-ssh.yml) continue ;; esac
      cp -n "$f" "/app/server/playbooks/$bn"
    done
  fi
  if [ ! -e /app/server/playbooks/update.yml ] && [ ! -L /app/server/playbooks/update.yml ] && [ -f /app/bundled-playbooks/update.yml ]; then
    cp /app/bundled-playbooks/update.yml /app/server/playbooks/update.yml
  fi
  chown -hR shipyard:shipyard /app/server/playbooks
fi

gosu shipyard test -r "$SSL_KEY" || fail "TLS key must be readable by UID 1001."
gosu shipyard test -r "$SSL_CERT" || fail "TLS certificate must be readable by UID 1001."
exec gosu shipyard node server/index.js
