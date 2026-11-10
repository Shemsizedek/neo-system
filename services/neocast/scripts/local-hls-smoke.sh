#!/usr/bin/env bash
# NEOCAST-002 offline, local-only synthetic video/audio smoke test.
# NO camera, microphone, network listener, remote stream, credentials or uploads.
set -Eeuo pipefail

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "BLOCKED: ffmpeg is not installed; local packaging is NOT verified." >&2
  exit 2
fi
if ! command -v ffprobe >/dev/null 2>&1; then
  echo "BLOCKED: ffprobe is not installed; local packaging is NOT verified." >&2
  exit 2
fi

workdir="$(mktemp -d "${TMPDIR:-/tmp}/neocast-002-hls-XXXXXXXX")"
trap 'rm -rf -- "$workdir"' EXIT
playlist="$workdir/index.m3u8"

# Only synthetic built-in test pattern and 440Hz tone; never touches real media.
ffmpeg -hide_banner -loglevel error -nostdin -y \
  -f lavfi -i "testsrc2=size=320x180:rate=15" \
  -f lavfi -i "sine=frequency=440:sample_rate=44100" \
  -t 4 -shortest \
  -c:v libx264 -preset ultrafast -pix_fmt yuv420p \
  -g 30 -keyint_min 30 -sc_threshold 0 -b:v 400k \
  -c:a aac -b:a 48k -ar 44100 \
  -f hls -hls_time 2 -hls_list_size 0 -hls_flags independent_segments \
  -hls_segment_filename "$workdir/segment_%03d.ts" \
  "$playlist"

test -s "$playlist"
grep -q '^#EXTM3U$' "$playlist"
grep -q '^#EXT-X-TARGETDURATION:' "$playlist"
shopt -s nullglob
segments=("$workdir"/segment_*.ts)
if (( ${#segments[@]} < 1 )); then
  echo "FAIL: no HLS video segment was created." >&2
  exit 1
fi
for segment in "${segments[@]}"; do
  test -s "$segment"
  video_codec="$(ffprobe -v error -select_streams v:0 \
    -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "$segment")"
  if [[ "$video_codec" != "h264" ]]; then
    echo "FAIL: segment missing H.264 video." >&2
    exit 1
  fi
done

printf 'NEOCAST-002 OFFLINE_HLS_PACKAGING_PASS segments=%s playlist=true\n' "${#segments[@]}"
echo "public_listener=false real_content=false viewer_playback_verified=false broadcast_live=false"
