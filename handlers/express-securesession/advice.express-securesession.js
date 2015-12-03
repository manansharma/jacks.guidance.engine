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
var SecureSession = require('./express-securesession');
var logger = require('../../log');
var File = require('../../file');
var Advice = require('../../advice');
var Guidance = require('../../guidance');
var Utils = require('../../utils');

function ExpressSecureSessionAdviceAssembler(blackboard) {
  this.currentState = 0;
  this.name = 'ExpressSecureSessionAdviceAssembler';

  var _self = this;

  this.getCurrentState = function() { return this.currentState; };

  this.ready = function() {
    return blackboard.count({trigger: SecureSession.ID, type: Constants.Type.EVENT}) > 0;
  };

  this.process = function(callback) {
    _self.currentState = 1;
    blackboard.take({
      template: {trigger: SecureSession.ID, type: Constants.Type.EVENT},
      ontake: function(event) {
        if(!Constants.Category.hasOwnProperty(event.category)) {
          logger.error(new Error('Unable to find the trigger category "' + event.category + '" in guidance engine'));
          _self.currentState = 0;
          return callback();
        }
        var file_background_template = 'background.mustache';
        var evidence_type = event.evidenceType;
        var file_evidence_template = SecureSession.EVIDENCES[evidence_type].template;
        var guidanceTitle = SecureSession.EVIDENCES[evidence_type].title;
        var event_id = event.id;
        var evidence_model = {
          "app_variable": event.expApp,
          "session_variable": event.expSession,
          "guidance_advice": event.advice
        };
        var background_template = fs.readFileSync(path.join(__dirname, file_background_template), 'utf8');
        var evidence_template = fs.readFileSync(path.join(__dirname, file_evidence_template), 'utf8');

        logger.debug("Creating patch for: " + guidanceTitle);
        fs.readFile(event.filename, 'utf8', function(err, data) {
          if(err) {
            logger.error(err);
            _self.currentState = 0;
            return callback();
          }

          var lines = data.split("\n");
          if(Array.isArray(event.patch)) {
            event.patch.forEach(function(patch) {
              if(patch.action === Constants.PatchActions.UPDATE) {
                // pick up advice from patch
                var lineIdx = patch.loc.start.line - 1;
                evidence_model["call_to_secure_assignment"] = lines[lineIdx].trim();
                lines[lineIdx] = Utils.replaceBetween(lines[lineIdx], patch.loc.start.column, patch.loc.end.column, patch.new);
                if(evidence_type === "set-secure-to-true-in-a-separate-call") {
                  evidence_model["line_number"] = patch.loc.start.line;
                  evidence_model["guidance_advice"] = lines[lineIdx].trim()
                }
              } else if(patch.action === Constants.PatchActions.INSERT) {
                try {
                  var regex = new RegExp(patch.regex);
                  for(var i = 0; i < lines.length; i++) {
                    if(lines[i].match(regex)) {
                      lines[i] = lines[i].replace(regex, patch.new);
                      break;
                    }
                  }
                } catch(e) {
                  logger.error(e);
                  _self.currentState = 0;
                  return callback();
                }
              }
            });
          }

          var evidence_rendered = mustache.render(background_template, event) + '\n\n' + mustache.render(evidence_template, evidence_model);
          var advice = new Advice(SecureSession.ID, Constants.Modality.PATCH, evidence_rendered);

          var patchfile = new File(SecureSession.ID, event.filename, 'Javascript', data, lines.join('\n'));
          patchfile.event_id = event.id;
          advice.files = [patchfile];

          var guidance = new Guidance(event_id, SecureSession.ID, event.category, event, guidanceTitle);
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
  return new ExpressSecureSessionAdviceAssembler(blackboard);
}

module.exports = create;