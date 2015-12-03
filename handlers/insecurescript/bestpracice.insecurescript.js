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

var mustache = require('mustache');
var path = require('path');
var uuid = require('uuid');
var fs = require('fs');

var Constants = require('../../constants');
var InsecureScript = require('./insecurescript');
var BestPractice = require('../../bestpractice');
var File = require('../../file');
var Advice = require('../../advice');
var logger = require('../../log');

function GuidanceBestPracticeInsecureScript(blackboard) {
    this.currentState = 0;
    this.name = 'GuidanceBestPracticeInsecureScript';

    this.getCurrentState = function() { return this.currentState; }

    var _self = this;

    this.ready = function() {
        return blackboard.count({trigger: InsecureScript.ID, http_available: false, https_available: false}) > 0;
    };

    this.process = function(callback) {
        _self.currentState = 1;
        blackboard.take({
            // Set this template to whatever you want to find
            template: {trigger: InsecureScript.ID, http_available: false, https_available: false},
            ontake: function(event) {
                if (blackboard.count({trigger: InsecureScript.ID, type: Constants.Modality.BEST_PRACTICE}) > 0) {
                    // Check to see if there is already a grouped advice on the space
                    if (blackboard.count({trigger: InsecureScript.ID, type: Constants.Modality.BEST_PRACTICE, grouped: blackboard.Match.WILDCARD}) > 0) {
                        blackboard.take({
                            template: {trigger: InsecureScript.ID, type: Constants.Modality.BEST_PRACTICE, grouped: blackboard.Match.WILDCARD},
                            ontake: function(advice) {
                                advice.event_id.push(event.id);
                                var containsFile = false;
                                advice.files.forEach(function(f) {
                                    if (f.path == event.filename) {
                                        logger.debug("Found Best Practice already associated with file: " + f.path);
                                        containsFile = true;
                                        f.startLine.push(event.startLine);
                                        f.startCol.push(event.startCol);
                                        f.endLine.push(event.endLine);
                                        f.endCol.push(event.endCol);
                                        f.event_id.push(event.id);
                                    }
                                });

                                if (!containsFile) {
                                    logger.debug("Adding new file to Best Practice: " + event.filename);
                                    var file = new File(InsecureScript.ID, event.filename, 'HTML');
                                    file.startLine = [event.startLine];
                                    file.startCol = [event.startCol];
                                    file.endLine = [event.endLine];
                                    file.endCol = [event.endCol];
                                    file.event_id = [event.id];
                                    advice.files.push(file);
                                }

                                blackboard.write(advice, function() {
                                    logger.debug("Grouped Best Practice advice from event: " + event.id);
                                    _self.currentState = 0;
                                    return callback();
                                });
                            }
                        })
                    } else {
                        logger.debug("No grouped Best Practice on space");
                        blackboard.take({
                            template: { trigger: InsecureScript.ID, type: Constants.Modality.BEST_PRACTICE },
                            ontake: function(advice) {
                                advice.event_id.push(event.id);
                                if (advice.files[0].path == event.filename) {
                                    logger.debug("Marking multiple instances in file: " + event.filename);
                                    advice.files[0].grouped = true;
                                    advice.files[0].event_id.push(event.id);
                                    advice.files[0].startLine.push(event.startLine);
                                    advice.files[0].startCol.push(event.startCol);
                                    advice.files[0].endLine.push(event.endLine);
                                    advice.files[0].endCol.push(event.endCol);
                                } else {
                                    logger.debug("Adding file " + event.filename + " to Advice");
                                    var file = new File(InsecureScript.ID, event.filename, 'HTML');
                                    file.event_id = [ event.id ];
                                    file.startLine = [event.startLine];
                                    file.startCol = [event.startCol];
                                    file.endLine = [event.endLine];
                                    file.endCol = [event.endCol];

                                    advice.files.push(file)
                                    advice.grouped = true;
                                }

                                blackboard.write(advice, function() {
                                    _self.currentState = 0;
                                    return callback();
                                });
                            }
                        });
                    }
                } else {
                    logger.debug("Adding new Best Practice");
                    var file = new File(InsecureScript.ID, event.filename, 'HTML');
                    file.event_id = [ event.id ];
                    file.startLine = [ event.startLine ];
                    file.startCol = [ event.startCol ];
                    file.endLine = [ event.endLine ];
                    file.endCol = [ event.endCol ];

                    var bp = new BestPractice(InsecureScript.ID, [event.id], [file]);
                    blackboard.write(bp, function() {
                        _self.currentState = 0;
                        return callback();
                    });
                }
            }
        });
    };
}

function create(blackboard) {
    return new GuidanceBestPracticeInsecureScript(blackboard);
}

module.exports = create;