#!/usr/bin/env bash

npm run build:clean &&
npm run build:production &&
git push origin production &&
git push production master
