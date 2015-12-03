'use strict';
var config = require('config');
var bunyan = require('bunyan');

var cfgObject = null;
try {
  cfgObject = config.get('logging');
} catch(err) {
  console.log(err.message);
  console.log("Defaulting to hardcoded config");
  cfgObject = {
    name: "jacks.guidance.engine",
    level: "trace"
  };
}

module.exports = bunyan.createLogger(cfgObject);