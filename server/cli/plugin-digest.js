'use strict';
const path=require('node:path');
const {pluginDigest,scheme}=require('../utils/plugin-digest');
const directory=process.argv[2];
if(process.argv.length!==3 || !directory || !path.isAbsolute(directory)) {
  console.error('Usage: node server/cli/plugin-digest.js /absolute/plugin-directory');process.exitCode=1;
} else {
  try {console.log(JSON.stringify({scheme,directory,digest:pluginDigest(directory)},null,2));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
