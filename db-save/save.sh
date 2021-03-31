#!/usr/bin/env bash

# current directory
DIRNAME=$(dirname "$0")
# current day
DAY=$(date +%u)

# go to save directory
cd $DIRNAME
cd $DAY;

# erase previous save
rm -rf dump/

# save
mongodump;