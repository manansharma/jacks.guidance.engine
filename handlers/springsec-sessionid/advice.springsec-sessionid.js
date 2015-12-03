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
var Advice = require('../../advice');
var Guidance = require('../../guidance');

var SpringSessionId = require('./springsec-sessionid');

function SpringSessionIdAdviceAssembler(blackboard) {
    this.currentState = 0;
    this.name = 'SpringSessionIdAdviceAssembler';

    var _self = this;

    this.getCurrentState = function() { return this.currentState; };

    this.ready = function() {
        return blackboard.count({trigger: SpringSessionId.ID, type: Constants.Type.EVENT}) > 0;
    };

    this.process = function(callback) {
        _self.currentState = 1;
        blackboard.take({
            template: {trigger: SpringSessionId.ID, type: Constants.Type.EVENT},
            ontake: function(event) {

                var file_background_template = 'background.mustache';
                var file_evidence_template = 'evidence.mustache';
                var guidanceTitle = SpringSessionId.EV_TITLE;
                var event_id = event.id;

                var background_template = fs.readFileSync(path.join(__dirname, file_background_template), 'utf8');
                var evidence_template = fs.readFileSync(path.join(__dirname, file_evidence_template), 'utf8');

                logger.debug("Creating patch for: " + guidanceTitle);
                fs.readFile(event.filename, 'utf8', function (err, data) {
                    if(err) {
                        logger.error(err);
                        _self.currentState = 0;
                        return;
                    }

                    var lines = data.split("\n");
                    var oldCode = lines[event.startLine - 1].substring(event.startCol - 1, event.endCol - 1);
                    var newCode = oldCode.replace('false', 'true');
                    lines[event.startLine - 1] = lines[event.startLine - 1].replace(oldCode, newCode);
                    var newFileContents = lines.join('\n');

                    var patchfile = new File(SpringSessionId.ID, event.filename, 'XML', data, newFileContents);
                    patchfile.event_id = event.id;

                    var evidence_model = {
                        xmlFile: newFileContents
                    };

                    var evidence_rendered = mustache.render(background_template, event) + '\n\n' + mustache.render(evidence_template, evidence_model);

                    var advice = new Advice(SpringSessionId.ID, Constants.Modality.PATCH, evidence_rendered);
                    advice.files = [patchfile];

                    var guidance = new Guidance(event_id, SpringSessionId.ID, Constants.Category.ROUTE, event, guidanceTitle);
                    guidance.addAdvice(advice);

                    logger.debug("Saving guidance for event(s): " + JSON.stringify(event_id));
                    blackboard.write(guidance, function() {
                        _self.currentState = 0;
                        return callback();
                    });
                });
            }
        });
    };
}

function create(blackboard) {
    return new SpringSessionIdAdviceAssembler(blackboard);
}

module.exports = create;