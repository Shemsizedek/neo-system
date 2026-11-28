#!/bin/sh
# NEO Key / USB Raptor: verify or stage a pinned Windows installer archive.
# Codespaces Linux CANNOT run the Windows EXE or see local USB devices.
# Opt-in only; never execute the installer, elevate, mount, or write a USB.
set -eu
umask 077

sha='ef57166a9f01bb204ef7ec3beb49634cb5f2dd8427d121d21e2bf1fda3a6ee6e'
bytes='9941035'
archive='USBRaptor_01994_(Cherry2)_Installer.zip'
source='https://sourceforge.net/projects/usbraptor/files/USBRaptor_01994_%28Cherry2%29_Installer.zip/download'

usage() {
  printf 'Usage: sh stage-usb-raptor.sh --verify ARCHIVE.zip | --stage ARCHIVE.zip | --download\n'
  printf '%s\n' 'Verification is read-only; stage/download write a private user cache only.'
  printf '%s\n' 'This never runs USB Raptor or configures a security device.'
}

check_archive() {
  if [ ! -f "$1" ]; then
    printf '%s\n' 'ARCHIVE=NOT_FOUND' >&2
    return 1
  fi
  if ! command -v sha256sum >/dev/null 2>&1; then
    printf '%s\n' 'SHA256_TOOL=MISSING' >&2
    return 1
  fi
  count=$(wc -c < "$1" | tr -d '[:space:]')
  if [ "$count" != "$bytes" ]; then
    printf '%s\n' 'ARCHIVE=WRONG_BYTE_COUNT' >&2
    return 1
  fi
  actual=$(sha256sum "$1" | cut -d ' ' -f1)
  if [ "$actual" != "$sha" ]; then
    printf '%s\n' 'ARCHIVE=SHA256_MISMATCH' >&2
    return 1
  fi
  printf '%s\n' 'ARCHIVE=SHA256_VERIFIED'
  printf '%s\n' 'RUNTIME=WINDOWS_ONLY_NOT_EXECUTED'
  printf '%s\n' 'FIDO2_CERTIFIED=NO'
}

case "$#" in
  1)
    case "$1" in
      --help|-h) usage; exit 0 ;;
      --download) mode=download ;;
      *) usage >&2; exit 2 ;;
    esac
    ;;
  2)
    case "$1" in
      --verify) mode=verify ;;
      --stage) mode=stage ;;
      *) usage >&2; exit 2 ;;
    esac
    ;;
  *) usage >&2; exit 2 ;;
esac

if [ "$mode" = verify ]; then
  check_archive "$2"
  exit 0
fi

if [ -z "$HOME" ]; then
  printf '%s\n' 'HOME=NOT_SET' >&2
  exit 1
fi
cache="$HOME/.cache/neo-key/usb-raptor"
mkdir -p "$cache"
tmp=$(mktemp "$cache/.archive.XXXXXXXX")
cleanup() { rm -f "$tmp"; }
trap cleanup EXIT HUP INT TERM

if [ "$mode" = stage ]; then
  check_archive "$2"
  cp "$2" "$tmp"
else
  if ! command -v curl >/dev/null 2>&1; then
    printf '%s\n' 'CURL=NOT_AVAILABLE' >&2
    exit 1
  fi
  printf '%s\n' 'DOWNLOAD=OFFICIAL_SOURCEFORGE_PINNED_ARCHIVE'
  curl --fail --location --silent --show-error --max-time 150 --retry 2 \
    --proto '=https' --proto-redir '=https' --output "$tmp" "$source"
fi

check_archive "$tmp"
chmod 600 "$tmp"
mv -f "$tmp" "$cache/$archive"
trap - EXIT HUP INT TERM
printf '%s\n' "STAGED_ARCHIVE=$cache/$archive"
printf '%s\n' 'INSTALLATION=NOT_PERFORMED'
printf '%s\n' 'LOCAL_USB=NOT_ACCESSED'
