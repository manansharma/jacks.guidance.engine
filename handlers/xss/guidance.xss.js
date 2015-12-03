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
var XSS = require('./xss');
var BestPractice = require('../../bestpractice');
var logger = require('../../log');
var File = require('../../file');
var Advice = require('../../advice');
var Guidance = require('../../guidance');

function GuidanceXSS(blackboard) {
    this.currentState = 0;
    this.name = 'GuidanceXSS';

    var _self = this;

    this.getCurrentState = function() {
        return this.currentState;
    };

    this.ready = function() {
        return blackboard.count({trigger: XSS.ID, type: Constants.Type.EVENT}) > 0;
    };

    this.process = function(callback) {
        _self.currentState = 1;
        blackboard.take({
            template: {trigger: XSS.ID, type: Constants.Type.EVENT},
            ontake: function(event) {
                var file_background_template = 'background.mustache';
                var file_bestpractice_template = 'bestpractice.mustache';
                var guidanceTitle = XSS.BP_TITLE;
                var background_template = fs.readFileSync(path.join(__dirname, file_background_template), 'utf8');
                var bestpractice_template = fs.readFileSync(path.join(__dirname, file_bestpractice_template), 'utf8');

                try {
                    var innerStack = event.stack.stack;
                    innerStack.forEach(function(s) {
                        s.code = s.code.trim();
                    });
                    var evidence_model = {
                        untrusted_data: event.code.trim(),
                        trace_stack: JSON.stringify(innerStack, null, 2),
                        trace_route: JSON.stringify(event.stack.route)
                    };
                } catch(e) {
                    throw new Error('Failure in retrieving code of untrusted input to path functions: ' + e.message);
                }

                var evidence_rendered = mustache.render(background_template, evidence_model) + '\n\n' + mustache.render(bestpractice_template, evidence_model);

                var advice = new Advice(XSS.ID, Constants.Modality.BEST_PRACTICE, evidence_rendered);

                logger.debug("Adding new file to Best Practice: " + event.filename);
                var file = new File(XSS.ID, event.filename, 'HTML');
                file.startLine = [event.startLine];
                file.startCol = [event.startCol];
                file.endLine = [event.endLine];
                file.endCol = [event.endCol];
                file.event_id = [event.id];
                advice.files = [file];

                var guidance = new Guidance(event.id, XSS.ID, Constants.Category.VIEW, event, guidanceTitle);
                guidance.addAdvice(advice);

                blackboard.write(guidance, function() {
                    _self.currentState = 0;
                    return callback();
                });
            }
        });
    };
}

function create(blackboard) {
    return new GuidanceXSS(blackboard);
}

module.exports = create;