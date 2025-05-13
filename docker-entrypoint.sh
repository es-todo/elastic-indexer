#!/bin/bash 

set -e

function do_exit() {
  echo "Stopping elasticsearch ..."
  kill -SIGTERM $ELASTIC_PID
  echo "Waiting ..."
  wait $ELASTIC_PID
  echo "Done."
}

trap do_exit SIGTERM SIGINT SIGHUP

sudo -u elasticsearch /usr/share/elasticsearch/bin/elasticsearch -v &

ELASTIC_PID=$!

echo "ElasticSearch starting."

sleep infinity &
wait $!
