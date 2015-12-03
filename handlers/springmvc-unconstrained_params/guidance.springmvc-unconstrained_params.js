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

var SpringUnconstrainedParams = require('./springmvc-unconstrained_params');

function SpringUnconstrainedParamsGuidanceWriter(blackboard) {
    this.currentState = 0;
    this.name = 'SpringUnconstrainedParamsGuidanceWriter';

    var _self = this;

    this.getCurrentState = function() { return this.currentState; };

    this.ready = function() {
        return blackboard.count({type: Constants.Type.EVENT, trigger: SpringUnconstrainedParams.ID}) == 0 && blackboard.count({type: Constants.Type.FILE, trigger: SpringUnconstrainedParams.ID}) > 0;
    };

    this.process = function(callback) {
        _self.currentState = 1;
        var files = blackboard.takeAll({type: Constants.Type.FILE, trigger: SpringUnconstrainedParams.ID});

        var file_background_template = (files.length > 1) ? 'background.multi.mustache' : 'background.single.mustache';
        var file_bestpractice_template = (files.length > 1) ? 'bestpractice.multi.mustache' : 'bestpractice.single.mustache';
        var guidanceTitle = SpringUnconstrainedParams.BP_TITLE;

        var background_template = fs.readFileSync(path.join(__dirname, file_background_template), 'utf8');
        var bestpractice_template = fs.readFileSync(path.join(__dirname, file_bestpractice_template), 'utf8');

        var events = [];
        var eventIds = [];
        var controllers = [];
        files.forEach(function(file) {
            file.event_id.forEach(function(eventId) {
                var event = blackboard.getObject({id: eventId});
                events.push(event);
                eventIds.push(eventId);
                controllers.push(event.controllerClass);
            });
        });

        var evidence_model = {
            controllerClass: events[0].controllerClass,
            hasInitBinder: events[0].hasInitBinder,
            controllers: controllers
        };

        var evidence_rendered = mustache.render(background_template, evidence_model) + '\n\n' + mustache.render(bestpractice_template, evidence_model);

        var advice = new Advice(SpringUnconstrainedParams.ID, Constants.Modality.BEST_PRACTICE, evidence_rendered);
        advice.files = files;
        var guidance;

        if(files.length > 1) {
            advice.grouped = true;
            guidance = new Guidance(eventIds, SpringUnconstrainedParams.ID, Constants.Category.ROUTE, events, guidanceTitle);
        } else {
            guidance = new Guidance(eventIds[0], SpringUnconstrainedParams.ID, Constants.Category.ROUTE, events[0], guidanceTitle);
        }

        guidance.addAdvice(advice);

        logger.debug("Saving guidance for event(s): " + JSON.stringify(eventIds));
        blackboard.write(guidance, function() {
            _self.currentState = 0;
           return callback(); 
        });
    };
}

function create(blackboard) {
    return new SpringUnconstrainedParamsGuidanceWriter(blackboard);
}

module.exports = create;