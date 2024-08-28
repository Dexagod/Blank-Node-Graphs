#!/bin/bash
npm install;
npm run build;

node dist/index.js -p 7846 -s http://xmlns.com/foaf/0.1/img http://xmlns.com/foaf/0.1/knows