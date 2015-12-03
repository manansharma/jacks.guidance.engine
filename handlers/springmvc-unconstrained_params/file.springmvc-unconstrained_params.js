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
var path = require('path');
var mustache = require('mustache');

var Constants = require('../../constants');
var logger = require('../../log');
var File = require('../../file');

var SpringUnconstrainedParams = require('./springmvc-unconstrained_params');

function SpringUnconstrainedParamsFileWriter(blackboard) {
    this.currentState = 0;
    this.name = 'SpringUnconstrainedParamsFileWriter';

    var _self = this;

    this.getCurrentState = function() { return this.currentState; };

    this.ready = function() {
        return blackboard.count({trigger: SpringUnconstrainedParams.ID, type: Constants.Type.EVENT}) > 0;
    };

    this.process = function(callback) {
        _self.currentState = 1;
        blackboard.take({
            template: {trigger: SpringUnconstrainedParams.ID, type: Constants.Type.EVENT},
            ontake: function(event) {
                logger.debug("Adding new file to Best Practice: " + event.filename);
                var file = new File(SpringUnconstrainedParams.ID, event.filename, 'Java');
                file.startLine = [event.startLine];
                file.startCol = [event.startCol];
                file.endLine = [event.endLine];
                file.endCol = [event.endCol];
                file.event_id = [event.id];

                logger.debug("Saving file for event(s): " + JSON.stringify(event.id));
                blackboard.write(file, function() {
                    _self.currentState = 0;
                    return callback();
                });
            }
        });
    };
}

function create(blackboard) {
    return new SpringUnconstrainedParamsFileWriter(blackboard);
}

module.exports = create;