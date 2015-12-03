/*
 * Copyright (c) 2015, Codiscope and/or its affiliates. All rights reserved.
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  Oracle designates this
 * particular file as subject to the "Classpath" exception as provided
 * by Oracle in the LICENSE file that accompanied this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the LICENSE file that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 */
var _     = require('underscore');
var http  = require('http');
var https = require('https');
var clone = require('clone');

var logger = require('./log');

var localPathPrefixes = ["/src/lofting.poc.utils/taskmaster/repo/", "/src/jacks.taskmaster/repo/"];

function stripLocalPathPrefix(path) {
  var result = path;
  if(typeof(path) == 'string') {
    localPathPrefixes.some(function(localPathPrefix){
      if(path.indexOf(localPathPrefix) == 0) {
        result = path.substr(localPathPrefix.length);
        return true;
      }
    });
  }
  return result;
}

function stripEventLocalPaths(event) {
  if(!event) return;
  if(Array.isArray(event)) {
    event.forEach(function(ev) {
      ev.filename = stripLocalPathPrefix(ev.filename);
    });
  } else {
    event.filename = stripLocalPathPrefix(event.filename);
  }
}

function stripAdviceLocalPaths(advice) {
  if(!advice) return;
  if(Array.isArray(advice)) {
    advice.forEach(function(ad) {
      ad.files.forEach(function(file) {
        file.path = stripLocalPathPrefix(file.path);
      });
    });
  } else {
    advice.files.forEach(function(file) {
      file.path = stripLocalPathPrefix(file.path);
    });
  }
}

function stripLocalPaths(param) {
  if(!param) return param;
  if(typeof(param) == 'string') {
    return stripLocalPathPrefix(param);
  } else if (typeof(param) == 'object') {
    var newGuidance = clone(param);
    stripEventLocalPaths(newGuidance.event);
    stripAdviceLocalPaths(newGuidance.advice);
    return newGuidance;
  }
}

function replaceBetween(str, startCol, endCol, newValue) {
  /**
   * Utility method to replace partial string between startCol and endCol with newValue,
   * returns original string if the operation fails.
   *
   * @param {string} str: original string
   * @param {number} startCol: start column index (from index 0)
   * @param {number} endCol: end column index (from index 0)
   * @param {*} newValue: the new value to replace (startCol, endCol) of str
   *
   * @return {string}: the string after replacement
   */
  if(typeof(str) === 'string' && startCol >= 0 && startCol <= endCol) {
    return str.substring(0, startCol) + newValue + str.substring(endCol);
  }
  return str;
}

function _genericGet(protocol, options, cb) {
  var cbOnce = _.once(cb);
  var timeoutWrapper = function(req) {
    return function() {
      req.abort();
      var err = new Error("Request timed out");
      logger.error(err);
      return cbOnce(err);
    };
  };

  var maxTime = 4000;
  var timeout = null;
  var timeoutFn = null;
  var content = '';
  var request = protocol.get(options, function(res) {
    res.on('data', function(data) {
      content += data;
      // reset timeout
      clearTimeout(timeout);
      timeout = setTimeout(timeoutFn, maxTime);
    }).on('end', function() {
      // clear timeout
      clearTimeout(timeout);
      if(res.statusCode != 200) {
        var err = new Error("Status code is " + res.statusCode);
        logger.error(err);
        return cbOnce(err);
      } else {
        return cbOnce(null, content);
      }
    }).on('error', function(err) {
      // clear timeout
      clearTimeout(timeout);
      logger.error(err);
      return cbOnce(err);
    });
  }).on('error', function(err) {
    // clear timeout
    clearTimeout(timeout);
    logger.error(err);
    return cbOnce(err);
  });

  // generate timeout handler
  timeoutFn = timeoutWrapper(request);

  // set initial timeout
  timeout = setTimeout(timeoutFn, maxTime);
}

function httpGet(options, callback) {
  return _genericGet(http, options, callback);
}

function httpsGet(options, callback) {
  return _genericGet(https, options, callback);
}

module.exports = {
  stripLocalPaths: stripLocalPaths,
  replaceBetween: replaceBetween,
  httpGet: httpGet,
  httpsGet: httpsGet
};
