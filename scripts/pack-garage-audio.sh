#!/bin/sh
# Re-pack every garage sound from its picked take, with the options recorded in art/comfy/audio.json.
# usage: sh scripts/pack-garage-audio.sh
set -e
python3 -c "
import json
for e in json.load(open('art/comfy/audio.json')):
    print(e['id'], e['pick'], ' '.join(e['pack']))
" | while read -r id pick opts; do
  # shellcheck disable=SC2086
  # ffmpeg reads stdin: keep it off the list this loop is reading
  python3 -I scripts/pack-audio.py "art/comfy/out/$id-$pick.mp3" "public/garage/audio/$id.mp3" $opts < /dev/null
done
