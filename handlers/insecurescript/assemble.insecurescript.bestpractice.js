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

var path = require('path');
var fs = require('fs');
var mustache = require('mustache');

var Constants = require(path.join(global.BaseDirectory, 'constants'));
var logger = require(path.join(global.BaseDirectory, 'log'));
var Guidance = require(path.join(global.BaseDirectory, 'guidance'));

var utils = require('../../utils');
var InsecureScript = require('./insecurescript');

function AssembleBestPracticeGuidance(blackboard) {
    var BP_TEMPLATE = {trigger: InsecureScript.ID, type: Constants.Modality.BEST_PRACTICE};
    var _self = this;

    this.currentState = 0;
    this.name = 'AssembleBestPracticeGuidance';

    this.getCurrentState = function() { return this.currentState; };

    this.ready = function() {
        return blackboard.count(BP_TEMPLATE) > 0;
    };

    this.process = function(callback) {
        _self.currentState = 1;
        blackboard.take({
            template: BP_TEMPLATE,
            ontake: function(advice) {
                var background_template = fs.readFileSync(path.join(__dirname,'background.mustache'), 'utf8');
                var evidence_template_file = 'single';
                var evidence_model = {};
                var events = [];

                if (advice.files.length > 1) {
                    evidence_template_file = 'multi';
                    evidence_model.views = [];
                    advice.files.forEach(function(f) {
                        var scripts = [];
                        f.event_id.forEach(function(event_id) {
                            var e = blackboard.getObject({type: Constants.Type.EVENT, id: event_id});
                            scripts.push({script: e.src});
                            events.push(e);
                        });
                        evidence_model.views.push({ view: utils.stripLocalPaths(f.path), scripts: scripts });
                    });
                } else if (advice.files.length == 1 && advice.files[0].grouped) {
                    evidence_model.scripts = [];
                    evidence_model.filename = utils.stripLocalPaths(advice.files[0].path);
                    advice.event_id.forEach(function(id) {
                        var e = blackboard.getObject({type: Constants.Type.EVENT, id: id});
                        events.push(e);
                        evidence_model.scripts.push(e.src);
                    });
                    evidence_template_file = 'singlefile';
                } else {
                    var event = blackboard.getObject({id:advice.event_id[0]});
                    events.push(event);
                    evidence_model.filename = utils.stripLocalPaths(advice.files[0].path);
                    evidence_model.scriptSource = event.src;
                    evidence_model.secureScriptSource = event.src.replace('http:','https:');
                    evidence_model.startLine = event.startLine;
                }

                var evidence_template = fs.readFileSync(path.join(__dirname, 'bestpractice.' + evidence_template_file + '.mustache'), 'utf8');
                var evidence_rendered = background_template + '\n\n' + mustache.render(evidence_template, evidence_model);
                advice.evidence = evidence_rendered;

                var guidance = new Guidance([], InsecureScript.ID, Constants.Category.DATA_VALIDATION, [], InsecureScript.BP_TITLE);
                guidance.addAdvice(advice);
                guidance.event = events;

                events.forEach(function(e) {
                    guidance.trigger_id.push(e.id);
                });

                logger.debug("Saving guidance for event(s): " + JSON.stringify(guidance.trigger_id));
                blackboard.write(guidance, function() {
                    _self.currentState = 0;
                    return callback();
                });
            }
        });
    };
}

function create(blackboard) {
    return new AssembleBestPracticeGuidance(blackboard);
}

module.exports = create;