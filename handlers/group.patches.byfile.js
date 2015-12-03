var diff_match_patch = require('googlediff');
var async = require('async');

var logger = require('../log');
var File = require('../file');
var Constants = require('../constants');

function GroupPatchesByFile(blackboard) {
    this.name = 'GroupPatchesByFile';
    this.currentState = 0;
    this.getCurrentState = function() { return this.currentState; };

    this.ready = function() {
        return (blackboard.count({type: 'EVENT'})) == 0 && blackboard.count({type: Constants.Type.FILE, grouped: blackboard.Match.NOT}) > 0;
    };

    var _self = this;

    this.process = function(callback) {
        // Wait until all events are processed to group
        _self.currentState = 1;
        var files = blackboard.takeAll({type: 'FILE'});

        if (!files || files.length < 2) {
            logger.debug('No files to combine');
            async.each(files, function(f, cb) {
                logger.debug('Saving back to space: ' + f.path);
                f.grouped = false;
                blackboard.write(f, cb);
            }, function(err) {
                _self.currentState = 0;
                return callback();
            });
        } else {
            var filemap = {};
            files.forEach(function(file) {
                if (!filemap[file.trigger]) {
                    logger.debug("New Trigger " + file.trigger);
                    logger.debug("New file " + file.path + " for trigger " + file.trigger);
                    var triggerfiles = {};
                    triggerfiles[file.path] = [ file ];
                    filemap[file.trigger] = triggerfiles;
                } else {
                    var triggerfiles = filemap[file.trigger];

                    if (triggerfiles[file.path]) {
                        logger.debug("Adding " + file.path + " for trigger " + file.trigger);
                        triggerfiles[file.path].push(file);
                    } else {
                        logger.debug("New file " + file.path + " for trigger " + file.trigger);
                        triggerfiles[file.path] = [ file ];
                    }
                }
            });

            var fileMapEntries = [];
            for (var trigger in filemap) {
                if (filemap.hasOwnProperty(trigger)) {
                    var triggerfiles = filemap[trigger];
                    for (name in triggerfiles) {
                        if (triggerfiles.hasOwnProperty(name)) {
                           fileMapEntries.push(triggerfiles[name]);
                        }
                    }
                }
            }
            async.each(fileMapEntries, processFileMapEntry, function() {
                _self.currentState = 0;
                return callback();
            });   
        }
    }

    function processFileMapEntry(filelist, callback) {
        if (filelist.length > 1) {
            var orig_content, new_content, path, lang, trigger, event_id;

            trigger = filelist[0].trigger;
            path = filelist[0].path;
            lang = filelist[0].lang;
            orig_content = filelist[0].old_content;
            new_content = orig_content;
            event_id = [];

            var startLine = [], startCol = [], endLine = [], endCol = [];

            filelist.forEach(function (p) {
                var dmp = new diff_match_patch();
                var diff = dmp.diff_main(orig_content, p.new_content);
                dmp.diff_cleanupEfficiency(diff);
                var patch = dmp.patch_make(diff);
                logger.debug("Applying patch to " + p.path);
                var results = dmp.patch_apply(patch, new_content);
                new_content = results[0];
                startLine.push(p.startLine);
                startCol.push(p.startCol);
                endLine.push(p.endLine);
                endCol.push(p.endCol);
                event_id.push(p.event_id);
            });

            var newPatch = new File(trigger, path, lang, orig_content, new_content);
            newPatch.event_id = event_id;
            newPatch.grouped = true;
            newPatch.startLine = startLine;
            newPatch.startCol = startCol;
            newPatch.endLine = endLine;
            newPatch.endCol = endCol;

            logger.debug("Saving new patch for " + path);
            blackboard.write(newPatch, callback);
        } else {
            logger.debug("Only one patch for " + filelist[0].path + " - No work to do.");
            filelist[0].grouped = false;
            blackboard.write(filelist[0], callback);
        }
    }
}

function create(blackboard) {
    return new GroupPatchesByFile(blackboard);
}

module.exports = create;