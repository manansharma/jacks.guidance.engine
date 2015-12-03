'use strict'

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

var _fs = require('fs');
var path = require('path');
var async = require('async');
var _     = require('underscore');

var Blackboard = require('./blackboard');
var logger     = require('./log');

if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}

// TODO: Turn this into a watchdog process for incremental analysis

/**
 *
 * @param analysisPath - The path that contains views.json, trigger*.json, and other json data objects
 * @constructor
 */
function Engine(analysisPath) {
    this.Model = [];
    this.Workers = [];
    var _views, _routes;
    // Build the model back up from the data in analysisPath
    logger.info("Loading model");
    try {
      _views = require(path.join(analysisPath, 'views.json'));
       logger.debug("Loaded " + _views.length + " views");
    } catch(e){
        logger.debug("No views found");
    }
    try {
        _routes = require(path.join(analysisPath, "routes.json"));
        logger.debug("Loaded " + _routes.length + " routes");
    } catch(e){
        logger.debug("No routes found");
    }

    this.Model['views'] = _views;
    this.Model['routes'] = _routes;

    var _self = this;

    _self.analysisPath = analysisPath;
    _self.blackboard = new Blackboard();

    // Read in trigger event instances
    logger.info("Loading trigger instances");
    _fs.readdirSync(analysisPath).forEach(function (file) {
        if (file.indexOf('trigger') === 0) {
            var triggerFile = path.join(analysisPath, file);
            var _trigger = require(triggerFile);
            if (_trigger.trigger) {
                logger.debug("Found trigger instance: " + _trigger.trigger + " [" + _trigger.id + "]");
                _trigger.type = 'EVENT';
                _self.blackboard.write(_trigger);
            }
        }
    });
    logger.info("Loaded " + _self.blackboard.getBlackboardObjects() + " trigger instances");

    var loadHandlersFromDirectory = function(dir) {
        logger.debug("Loading handlers from: " + dir);
        _fs.readdirSync(dir).forEach(function(file) {
            var f = path.join(dir, file);
            var stat = _fs.statSync(f);
            if (stat.isDirectory(f)) {
                loadHandlersFromDirectory(f);
            } else {
                if (f.endsWith('.js')) {
                    var _worker = require(f);
                    if (typeof _worker === 'function') {
                        logger.debug('Adding handler: ' + file);
                        // add 4 workers of each type to accelerate asynchronous processing
                        _self.Workers.push(_worker(_self.blackboard), _worker(_self.blackboard), _worker(_self.blackboard), _worker(_self.blackboard), _worker(_self.blackboard));
                    }
                }
            }
        });
    };

    // Populate Workers
    var handlersDir = path.join(__dirname, "handlers");
    loadHandlersFromDirectory(handlersDir);

    this.process = function(callback) {
        logger.info('Processing started');
        _process.call(_self, _.once(done));

        function done(stats) {
            logger.info('Processing done');
            return callback(stats);
        }
    };

    function _process(callback) {
        var stats = {ran: 0, busy: 0, waiting: 0};
        async.each(_self.Workers, function(worker, cb) {
            var state = worker.getCurrentState();
            var ready = worker.ready();
            if(state == 0) {
                if(ready) {
                    stats.ran++;
                    logger.debug('Executing handler: ' + worker.name);
                    worker.process(function(){
                        logger.debug('Handler execution done: ' + worker.name);
                        setImmediate(_process.bind(_self, callback));
                        return cb();
                    });
                } else {
                    stats.waiting++;
                    return cb();
                }
            } else {
                stats.busy++;
                return cb();
            }
        }, function() {
            logger.debug('Handler execution stats: ' + JSON.stringify(stats));
            if(stats.ran == 0 && stats.busy == 0) return callback(stats);
        });
    }
}

module.exports = Engine;