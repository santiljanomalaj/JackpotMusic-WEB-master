#!/usr/bin/env bash

npm run build:clean &&
npm run build:staging &&
git push origin staging &&
git push staging master
