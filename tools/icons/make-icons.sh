#!/bin/sh
# Renders the install icons from tools/icons/icon.svg with the playwright-cli browser. Run from the repository root.
set -e
cd tools/icons
python3 -m http.server 5191 --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
sleep 1
P="playwright-cli -s=icons"
for spec in "180 0 icon-180" "192 0 icon-192" "512 0 icon-512" "512 1 icon-maskable-512"; do
  set -- $spec
  $P open "http://127.0.0.1:5191/icon.html?size=$1&mask=$2" >/dev/null
  $P resize "$1" "$1" >/dev/null
  $P screenshot "#host" --filename "../../public/icons/$3.png" >/dev/null
done
$P close >/dev/null
kill $SERVER
