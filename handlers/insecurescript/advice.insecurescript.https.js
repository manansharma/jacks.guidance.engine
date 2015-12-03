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
var Advice = require('../../advice');
var Guidance = require('../../guidance');
var utils = require('../../utils');

var InsecureScript = require('./insecurescript');

function HttpsPatchAdviceAssembler(blackboard) {
    this.currentState = 0;
    this.name = 'HttpsPatchAdviceAssembler';

    var _self = this;

    this.getCurrentState = function() { return this.currentState; };

    this.ready = function() {
        return blackboard.count({type: Constants.Type.EVENT}) == 0
            && blackboard.count({type: Constants.Type.FILE, grouped: blackboard.Match.WILDCARD, trigger: InsecureScript.ID}) > 0;
    };

    this.process = function(callback) {
        _self.currentState = 1;
        var files = blackboard.takeAll({type: Constants.Type.FILE, grouped: blackboard.Match.WILDCARD, trigger: InsecureScript.ID});

        if (!files.length || files.length < 1) {
            // No patches to process -- This should *never* happen
            _self.currentState = 0;
            return callback();
        }


        var file_background_template = 'background.mustache';
        var file_evidence_template = 'evidence.ssl.single.mustache';
        var evidence_model = {};
        var event = {};
        var event_id;

        if (files.length > 1) {
            file_evidence_template = 'evidence.ssl.multifile.mustache';
            event = [];
            event_id = [];

            files.forEach(function(f) {
                if (f.grouped) {
                    f.event_id.forEach(function(e) {
                        logger.debug("Looking up event Id: " + e);
                        event.push(blackboard.getObject({id: e}));
                        event_id.push(e);
                    });
                } else {
                    logger.debug("Looking up event Id: " + f.event_id);
                    event.push(blackboard.getObject({id: f.event_id}));
                    event_id.push(f.event_id);
                }
            });
        } else {
            if (files[0].grouped) {
                file_evidence_template = 'evidence.ssl.singlefile.mustache';
                evidence_model.path = utils.stripLocalPaths(files[0].path);
                event = [];
                event_id = [];
                files[0].event_id.forEach(function(e) {
                    event.push(blackboard.getObject({id: e}));
                    event_id.push(e);
                });
            } else {
                event = blackboard.getObject({id: files[0].event_id});
                event_id = files[0].event_id;
                evidence_model.path = utils.stripLocalPaths(files[0].path);
                evidence_model.startPos = event.startLine;
                evidence_model.scriptSource = event.src;
                evidence_model.secureScriptSource = event.src.replace('http:','https:');
            }
        }

        var background_template = fs.readFileSync(path.join(__dirname, file_background_template), 'utf8');
        var evidence_template = fs.readFileSync(path.join(__dirname, file_evidence_template), 'utf8');

        var evidence_rendered = mustache.render(background_template, event) + '\n\n' + mustache.render(evidence_template, evidence_model);

        var advice = new Advice(InsecureScript.ID, Constants.Modality.PATCH, evidence_rendered);
        advice.files = files;

        var guidance = new Guidance(event_id, InsecureScript.ID, Constants.Category.DATA_VALIDATION, event, InsecureScript.PATCH_TITLE);
        guidance.addAdvice(advice);

        logger.debug("Saving guidance for event(s): " + JSON.stringify(event_id));
        blackboard.write(guidance, function() {
            _self.currentState = 0;
            return callback();
        });
    };
}

function create(blackboard) {
    return new HttpsPatchAdviceAssembler(blackboard);
}

module.exports = create;