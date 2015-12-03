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

var XPoweredBy = require('./express-xpoweredby');

function ExpressXPoweredByAdviceAssembler(blackboard) {
    this.currentState = 0;
    this.name = 'ExpressXPoweredByAdviceAssembler';

    var _self = this;

    this.getCurrentState = function() { return this.currentState; };

    this.ready = function() {
        return blackboard.count({trigger: XPoweredBy.ID, type: Constants.Type.EVENT}) > 0;
    };

    this.process = function(callback) {
        _self.currentState = 1;
        blackboard.take({template: {trigger: XPoweredBy.ID, type: Constants.Type.EVENT}, ontake: function(event) {
            var file_background_template = 'background.mustache';
            var file_evidence_template = event.helmet ? 'evidence.helmet.mustache' : 'evidence.express.mustache';
            var guidanceTitle = event.helmet ? XPoweredBy.EV_HELMET_TITLE : XPoweredBy.EV_EXPRESS_TITLE;
            var event_id = event.id;
            var evidence_model = {
                helmet: event.helmet
            };

            var background_template = fs.readFileSync(path.join(__dirname, file_background_template), 'utf8');
            var evidence_template = fs.readFileSync(path.join(__dirname, file_evidence_template), 'utf8');

            var evidence_rendered = mustache.render(background_template, event) + '\n\n' + mustache.render(evidence_template, evidence_model);

            var advice = new Advice(XPoweredBy.ID, Constants.Modality.PATCH, evidence_rendered);

            logger.debug("Creating patch for: " + guidanceTitle);
            fs.readFile(event.filename, 'utf8', function (err, data) {
                if(err) {
                    logger.error(err);
                    _self.currentState = 0;
                    return callback();
                }

                var lines = data.split("\n");
                var targetLine = event.expLine;

                if(event.helmet) {
                    var patchCode = (event.expApp ? event.expApp : "app") + ".use(" + event.helmet + ".hidePoweredBy());";
                    lines.splice(targetLine, 0, patchCode);
                } else {
                    var patchCode = (event.expApp ? event.expApp : "app") + ".disable('X-Powered-By');";
                    lines.splice(targetLine, 0, patchCode);
                }

                var patchfile = new File(XPoweredBy.ID, event.filename, 'Javascript', data, lines.join('\n'));
                patchfile.event_id = event.id;

                advice.files = [patchfile];

                var guidance = new Guidance(event_id, XPoweredBy.ID, Constants.Category.STATE_MANAGEMENT, event, guidanceTitle);
                guidance.addAdvice(advice);

                logger.debug("Saving guidance for event(s): " + JSON.stringify(event_id));
                blackboard.write(guidance, function() {
                    _self.currentState = 0;
                    return callback();
                });
            });
        }});
    };
}

function create(blackboard) {
    return new ExpressXPoweredByAdviceAssembler(blackboard);
}

module.exports = create;