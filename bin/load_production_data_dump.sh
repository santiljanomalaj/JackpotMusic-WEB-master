#!/usr/bin/env bash

DUMP_DIRECTORY=../.tmp/mongodump/

# SONGS
mongodump -h ${JACKPOT_PRODUCTION_DATABASE_HOST} \
          -d ${JACKPOT_PRODUCTION_DATABASE_NAME} \
          -c songs \
          -u ${JACKPOT_PRODUCTION_DATABASE_USERNAME} \
          -p ${JACKPOT_PRODUCTION_DATABASE_PASSWORD} \
          -o ${DUMP_DIRECTORY}


mongorestore -h localhost \
             -d jackpot-music-game \
             -c songs \
             ${DUMP_DIRECTORY}/${JACKPOT_PRODUCTION_DATABASE_USERNAME}/songs.bson
