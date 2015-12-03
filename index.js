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

// Libraries
var async = require('async');
var path = require('path');
var fs = require('fs');

// Dependencies
var Engine = require('./engine');
var logger = require('./log');
var Constants = require('./constants');
var utils = require('./utils');

logger.info('Setting Base Directory to: ' + __dirname);
global.BaseDirectory = __dirname;

var analysisDir = process.argv[2];
logger.info("Using Analysis Directory: " + analysisDir);

var engine = new Engine(analysisDir);

function writeGuidanceToDisk(callback) {
    logger.info("Found " + engine.blackboard.getPendingRequests() + " pending");
    logger.info("Found " + engine.blackboard.getBlackboardObjects() + " objects on space");
    logger.info("Writing guidance objects to disk");
    logger.info("Setting Output Path to: " + engine.analysisPath);
    async.each(engine.blackboard.getBlackboard(), function(guidance, cb) {
        if (guidance.type == 'GUIDANCE') {
            // Do some work here
            var p = path.join(engine.analysisPath, 'guidance.' + guidance.id + '.json');
            logger.info("Writing Guidance to " + p);
            fs.writeFile(p, JSON.stringify(utils.stripLocalPaths(guidance), null, 3), function() {
                return cb();
            });
        } else {
            return cb();
        }
    }, callback);
}

function spaceDump() {
    logger.debug("Space Dump: ");
    engine.blackboard.getBlackboard().forEach(function (e, idx) {
        logger.debug(idx + ' ---- ' + JSON.stringify(e));
    });
}

function exit() {
    logger.info("Exiting");
    process.exit(0);
}

function run(callback) {
    engine.process(function(stats) {
        return callback();
        // setTimeout(run, 1000);
    });
}

run(function() {
    writeGuidanceToDisk(function() {
        exit();
    })
});
