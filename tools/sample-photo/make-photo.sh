#!/bin/sh
# Renders the fictional sample notice photo (public/sample-notice.jpg) from notice.html. Run from the repository root.
set -e
python3 -m http.server 5190 --bind 127.0.0.1 --directory tools/sample-photo >/dev/null 2>&1 &
SERVER=$!
sleep 1
P="playwright-cli -s=photo"
$P open "http://127.0.0.1:5190/notice.html" >/dev/null
$P resize 1200 1340 >/dev/null
$P screenshot --filename /tmp/onhours-notice.png >/dev/null
$P close >/dev/null
kill $SERVER
ffmpeg -v error -y -i /tmp/onhours-notice.png -q:v 3 public/sample-notice.jpg
