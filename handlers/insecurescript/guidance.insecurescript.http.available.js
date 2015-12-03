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
var md5 = require('md5');

var InsecureScript = require('./insecurescript');
var logger = require('../../log');
var Constants = require('../../constants');
var utils = require('../../utils');

function CheckIfInsecureScriptAvailableWorker(blackboard) {
    var _self = this;
    this.name = 'CheckIfInsecureScriptAvailableWorker';
    this.currentState = 0;

    this.ready = function() {
        return blackboard.count({trigger: InsecureScript.ID, type: Constants.Type.EVENT, http_digest: blackboard.Match.NOT}) > 0;
    };

    this.process = function(callback) {
        _self.currentState = 1;
        blackboard.take({
            template: {trigger: InsecureScript.ID, type: Constants.Type.EVENT, http_digest: blackboard.Match.NOT},
            ontake: function(event) {
                downloadScript(event, function() {
                    _self.currentState = 0;
                    return callback();
                });
            }
        });
    };

    this.getCurrentState = function() { return _self.currentState; };

    function downloadScript(event, callback) {
        var _insecureSrc = event.src;
        logger.debug("[" + _insecureSrc + "] - " + "Trying Insecure Fetch of Script");
        utils.httpGet(_insecureSrc, function(err, data) {
            // ignoring errors for now -> means no data
            return updateEvent(event, data, callback);
        });
    }

    function updateEvent(event, content, callback) {
        var _insecureSrc = event.src;
        var digest = content ? md5(content) : 'not-available';
        logger.debug("[" + _insecureSrc + "] - " + 'Setting Insecure Script Digest to ' + digest);
        event.http_available = content ? true : false;
        event.http_digest = digest;
        blackboard.write(event, function() {
            return callback();
        });
    }
}

function create(blackboard) {
    return new CheckIfInsecureScriptAvailableWorker(blackboard);
}

module.exports = create;