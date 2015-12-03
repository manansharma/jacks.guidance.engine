var Constants = require('./constants');

function File(trigger, path, lang, old_content, new_content) {
    this.trigger = trigger;
    this.type = Constants.Type.FILE;
    this.path = path;
    this.lang = lang;
    this.old_content = old_content;
    this.new_content = new_content;
    this.event_id = [];
}

module.exports = File;