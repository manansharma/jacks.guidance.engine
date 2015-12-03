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

var Constants = require('../constants');
var logger = require('../log');

function GroupBestPracticeByFile(blackboard) {
    this.currentState = 0;
    this.name = 'GroupBestPracticeByFile';

    var _self = this;

    this.getCurrentState = function() { return this.currentState; };

    this.ready = function() {
        // ***** TEMPORARY UNTIL THIS HANDLER IS COMPLETED *****
        return false;
        // ***** TEMPORARY UNTIL THIS HANDLER IS COMPLETED *****
        
        // logger.debug("Checking if ready to group " + blackboard.count({type: Constants.Modality.BEST_PRACTICE, grouped: blackboard.Match.NOT}) + " Unprocessed Best Practices");
        // return (blackboard.count({type: 'EVENT'})) == 0 && blackboard.count({type: Constants.Modality.BEST_PRACTICE, grouped: blackboard.Match.NOT}) > 0;
    };

    this.process = function(callback) {
        _self.currentState = 1;
        var all = blackboard.takeAll({ type: Constants.Modality.BEST_PRACTICE });

        var triggermap = {};

        all.forEach(function(bp) {
            if (!triggermap[bp.trigger]) {
                logger.debug("New trigger: " + bp.trigger);
                triggermap[bp.trigger] = {};
            }

            var triggerfiles = triggermap[bp.trigger];
            if (!triggerfiles[bp.files]) {
                logger.debug("New file " + bp.files + " for trigger: " + bp.trigger);
                triggerfiles[bp.files] = [ bp ];
            } else {
                logger.debug("Adding to file " + bp.files + " for trigger: " + bp.trigger);
                triggerfiles[bp.files].push(bp);
            }
        });

        logger.debug(JSON.stringify(triggermap, null, 2));

        for (var trigger in triggermap) {
            if (triggermap.hasOwnProperty(trigger)) {
                var triggerfiles = triggermap[trigger];
                for (var file in triggerfiles) {
                    if (triggerfiles.hasOwnProperty(file)) {
                        logger.debug("Working on " + JSON.stringify(triggerfiles[file]));

                    }
                }
            }
        }
    };
}

function create(blackboard) {
    return new GroupBestPracticeByFile(blackboard);
}

module.exports = create;