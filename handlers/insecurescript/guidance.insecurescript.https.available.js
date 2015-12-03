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
var uuid = require('uuid');

var InsecureScript = require('./insecurescript');
var logger = require('../../log');
var Constants = require('../../constants');
var utils = require('../../utils');

function CheckIfSecureScriptAvailableWorker(blackboard) {
    var _self = this;
    this.name = 'CheckIfSecureScriptAvailableWorker';
    this.currentState = 0;

    this.ready = function() {
        return blackboard.count({trigger: InsecureScript.ID, type: Constants.Type.EVENT, https_digest: blackboard.Match.NOT}) > 0;
    };

    this.process = function(callback) {
        _self.currentState = 1;
        blackboard.take({
            template: {trigger: InsecureScript.ID, type: Constants.Type.EVENT, https_digest: blackboard.Match.NOT},
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
        var _secureSrc = event.src.replace('http:', 'https:');
        logger.debug("[" + _secureSrc + "] - " + "Trying Secure Fetch of Script");
        utils.httpsGet(_secureSrc, function(err, data) {
            // ignoring errors for now -> means no data
            return updateEvent(event, data, callback);
        });
    }

    function updateEvent(event, content, callback) {
        var _secureSrc = event.src.replace('http:', 'https:');
        var digest = content?md5(content):'not-available';
        logger.debug("[" + _secureSrc + "] - " + 'Setting Secure Script Digest to ' + digest);
        event.https_available = content?true:false;
        event.https_digest = digest;
        blackboard.write(event, function(e) {
            logger.debug("[" + e.src + "] - " + "Freeing Worker");
            return callback();
        });
    }
}

function create(blackboard) {
    return new CheckIfSecureScriptAvailableWorker(blackboard);
}

module.exports = create;