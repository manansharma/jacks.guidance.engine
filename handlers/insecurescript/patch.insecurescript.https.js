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

var fs = require('fs');

var InsecureScript = require('./insecurescript');
var logger = require('../../log');
var File = require('../../file');
var Constants = require('../../constants');

function InsecureScriptPatchHTTPS(blackboard) {
    var _self = this;
    this.currentState = 0;
    this.name = 'InsecureScriptPatchHTTPS';

    this.getCurrentState = function() { return this.currentState; };

    this.ready = function() {
        return blackboard.count({trigger: InsecureScript.ID, http_available: true, https_available: true }) > 0;
    };

    this.process = function(callback) {
        _self.currentState = 1;
        blackboard.take({
            // Set this template to whatever you want to find
            template: {trigger: InsecureScript.ID, http_available: true, https_available: true },
            ontake: function(event) {
                if (event.http_digest === event.https_digest) {
                    _self.currentState = 1;
                    logger.debug("Creating patch for " + event.src);

                    fs.readFile(event.filename, 'utf8', function(err, data) {
                        var lines = data.split("\n");
                        var targetLine = event.startLine - 1;

                        lines[targetLine] = lines[targetLine].replace('http:', 'https:');

                        var patchfile = new File(InsecureScript.ID, event.filename, 'HTML', data, lines.join('\n'));
                        patchfile.startLine = event.startLine;
                        patchfile.startCol = event.startCol;
                        patchfile.endLine = event.endLine;
                        patchfile.endCol = event.endCol;
                        patchfile.event_id = event.id;

                        blackboard.write(patchfile, function (e) {
                            logger.debug("Added patchfile for event: " + event.id);
                            _self.currentState = 0;
                            return callback();
                        });
                    });
                } else {
                    // digests don't match... missing code here?
                    _self.currentState = 0;
                    return callback();
                }
            }
        });
    };
}

function create(blackboard) {
    return new InsecureScriptPatchHTTPS(blackboard);
}

module.exports = create;