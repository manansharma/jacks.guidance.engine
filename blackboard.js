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

var async = require('async');
var st = require('stack-trace');
var path = require('path');
var logger = require('./log');

var WILDCARD = { toString: function () { return "*WILDCARD*"; } };
var NOT = { toString: function () { return "*NOT*"; } };

var matches = function(template, tuple) {
    for ( var p in template ) {
        if ( template[p] === NOT ) {
            if (p in tuple) {
                logger.trace('Blackboard match property: ' + JSON.stringify(p) + ' = NOT / No Match' );
                return false;
            } else {
                logger.trace('Blackboard match property: ' + JSON.stringify(p) + ' = NOT / Matches' );
                continue;
            }
        }
        if ( !tuple.hasOwnProperty(p)) {
            logger.trace('Blackboard match property: ' + JSON.stringify(p) + ' = Not Present / No Match' );
            return false;
        }
        if ( template[p] === WILDCARD ) {
            logger.trace('Blackboard match property: ' + JSON.stringify(p) + ' = * / Matches' );
            continue;
        }
        if ( tuple[p] != template[p] ) {
            logger.trace('Blackboard match property: ' + JSON.stringify(p) + ':' + template[p] + ' = ' + JSON.stringify(p) + ':' + tuple[p] + ' / Matches' );
            return false;
        }
    }
    logger.trace('Blackboard match found');
    return true;
};

function Blackboard() {
    this.name = "Blackboard";
    
    var _self = this;
    
    var space = [];
    var pending = [];

    var AVAILABLE, CHECKED_OUT = 1;

    this.Match = {
        WILDCARD: WILDCARD,
        NOT: NOT
    };

    /**
     * Writes something to the shared space. If that thing already exists in the space then it will update the existing
     * thing.
     * @param thing
     * @param callback is called with the element being written after it is added to the space.
     */
    this.write = function(thing, callback) {
        var caller = st.get()[1];
        logger.trace({data: thing, method: 'blackboard.write', caller: path.basename(caller.getFileName()), line: caller.getLineNumber()}, "Method call");
        var addit = true;
        async.each(pending, function(p, cb) {
            if (matches(p.template, thing)) {
                logger.trace({caller: path.basename(caller.getFileName()), line: caller.getLineNumber()}, "Found Pending Request on write: " + thing.type);
                p.state = CHECKED_OUT;
                p.ontake(thing);
                addit = false;
            }
            return cb();
        }, function(err) {
            if (addit) {
                logger.trace({caller: path.basename(caller.getFileName()), line: caller.getLineNumber()}, "Writing to space: " + thing.type);
                thing.state = AVAILABLE;
                space.push(thing);
            }
            if(callback) return callback(thing);
        });
    };

    /**
     * Matches against the supplied template and removes the matched item from the shared space. This will never match
     * more than one item at a time.
     * @param template
     */
    this.take = function(request) {
        var caller = st.get()[1];
        logger.trace({data: request.template, method: 'blackboard.take', caller: path.basename(caller.getFileName()), line: caller.getLineNumber()}, "Method call");
        var found = false;
        space.some(function(thing, idx) {
            if (matches(request.template, thing) && thing.state == AVAILABLE) {
                logger.debug({template: request.template, caller: path.basename(caller.getFileName()), line: caller.getLineNumber()}, "Found Pending Request Template");
                thing.state = CHECKED_OUT;
                request.ontake(thing);
                found = true;
                return true;
            }
        });

        if (found) return;

        if (request.priority === undefined) {
            request.priority = 100;
        }

        if (request.expires === undefined) {
            request.expires = 1;
        }

        request.start = new Date().getMilliseconds();

        pending.push(request);
        pending.sort(function(a,b) { return b.priority - a.priority; } )
    };

    this.peek = function(template) {
        var caller = st.get()[1];
        logger.trace({data: template, method: 'blackboard.peek', caller: path.basename(caller.getFileName()), line: caller.getLineNumber()}, "Method call");
        var obj = null;
        space.forEach(function(e) {
            if (matches(template, e) && e.state == AVAILABLE) {
                obj = e;
            }
        });
        return obj;
    };

    this.takeAll = function(template) {
        var caller = st.get()[1];
        logger.trace({data: template, method: 'blackboard.takeAll', caller: path.basename(caller.getFileName()), line: caller.getLineNumber()}, "Method call");
        var found = [];
        space.forEach(function(e) {
            if (matches(template, e) && e.state == AVAILABLE) {
                logger.debug("Found Matching Element - " + e.type);
                e.state = CHECKED_OUT;
                found.push(e);
            }
        });
        return found;
    };

    this.peekAll = function(template) {
        var caller = st.get()[1];
        logger.trace({data: template, method: 'blackboard.peekAll', caller: path.basename(caller.getFileName()), line: caller.getLineNumber()}, "Method call");
        var found = [];
        space.forEach(function(e) {
            if (matches(template,e) && e.state == AVAILABLE) {
                logger.debug("Found Matching Element (Peek) - " + e.type);
                found.push(e);
            }
        });
        return found;
    };

    /**
     * Get's an object from the space, regardless of it's state. Functions exactly like peek (does not remove the item
     * from the space). If there is more than one match, there is no guarantee which one will be returned.
     *
     * @param template The example by which to match on
     */
    this.getObject = function(template) {
        var caller = st.get()[1];
        logger.trace({data: template, method: 'blackboard.getObject', caller: path.basename(caller.getFileName()), line: caller.getLineNumber()}, "Method call");
        var obj = null;
        space.forEach(function(e) {
            if (matches(template,e)) obj = e;
        });
        return obj;
    };

    this.count = function(template) {
        var caller = st.get()[1];
        logger.trace({data: template, method: 'blackboard.count', caller: path.basename(caller.getFileName()), line: caller.getLineNumber()}, "Method call");
        var count = 0;
        space.forEach(function(e) {
            if (matches(template,e) && e.state == AVAILABLE) count ++;
        });
        return count;
    };

    this.isEmpty = function() {
        var caller = st.get()[1];
        logger.trace({method: 'blackboard.isEmpty', caller: path.basename(caller.getFileName()), line: caller.getLineNumber()}, "Method call");
        return space.length === 0;
    };

    this.getPendingRequests = function() {
        var caller = st.get()[1];
        logger.trace({method: 'blackboard.getPendingRequests', caller: path.basename(caller.getFileName()), line: caller.getLineNumber()}, "Method call");
        return pending.length;
    };

    this.getBlackboardObjects = function() {
        var caller = st.get()[1];
        logger.trace({method: 'blackboard.getBlackboardObjects', caller: path.basename(caller.getFileName()), line: caller.getLineNumber()}, "Method call");
        return space.length;
    };

    this.getBlackboard = function() {
        var caller = st.get()[1];
        logger.trace({method: 'blackboard.getBlackboard', caller: path.basename(caller.getFileName()), line: caller.getLineNumber()}, "Method call");
        return space;
    };

    this.getPending = function() {
        var caller = st.get()[1];
        logger.trace({method: 'blackboard.getPending', caller: path.basename(caller.getFileName()), line: caller.getLineNumber()}, "Method call");
        return pending;
    };

    // function clearExpired() {
    //     logger.debug({method: 'blackboard.clearExpired', caller: path.basename(caller.getFileName()), line: caller.getLineNumber()}, "Method call");
    //     pending.forEach(function(request, idx) {
    //         var elapsed = new Date().getMilliseconds() - request.start;
    //         if (elapsed >= request.expires) {
    //             pending.splice(idx, 1);
    //         }
    //     });

    //     setTimeout(clearExpired, 50);
    // }

    // async.nextTick(clearExpired);
}

module.exports = Blackboard;