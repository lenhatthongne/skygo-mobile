#!/usr/bin/env bash
# Points the app at the backend on this Mac over Wi-Fi, so a real phone or a prebuilt app can reach it.
#   scripts/use-lan-api.sh          set EXPO_PUBLIC_API_URL in .env.local to http://<this Mac's LAN IP>:8080/api
#   scripts/use-lan-api.sh --local  remove it (simulator/emulator defaults apply again)
# EXPO_PUBLIC_* values are read when Metro starts and baked in at build time: restart Expo (or
# rebuild) after running this. The backend must run with `scripts/run-dev.sh --lan`.
set -euo pipefail
cd "$(dirname "$0")/.."
FILE=.env.local
touch "$FILE"
# Keep every other line of .env.local; only this one variable is replaced.
others="$(grep -v '^EXPO_PUBLIC_API_URL=' "$FILE" || true)"
if [[ "${1:-}" == "--local" ]]; then
  printf '%s\n' "$others" | sed '/^$/d' > "$FILE"
  echo "Đã bỏ EXPO_PUBLIC_API_URL: app dùng localhost (iOS) hoặc 10.0.2.2 (Android emulator)."
  exit 0
fi
ip="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
if [[ -z "$ip" ]]; then
  echo "Không tìm thấy địa chỉ Wi-Fi của máy. Kết nối Wi-Fi rồi chạy lại." >&2
  exit 1
fi
{
  printf '%s\n' "$others" | sed '/^$/d'
  echo "EXPO_PUBLIC_API_URL=http://${ip}:8080/api"
} > "$FILE"
echo "Đã đặt EXPO_PUBLIC_API_URL=http://${ip}:8080/api trong .env.local"
echo "Nhớ chạy backend bằng 'scripts/run-dev.sh --lan' (trong skygo-backend) rồi khởi động lại Expo."
