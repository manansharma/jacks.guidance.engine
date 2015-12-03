var Constants = require('./constants');

function BestPractice(trigger, event_id, files) {
    this.type = Constants.Modality.BEST_PRACTICE;
    this.trigger = trigger;

    if (event_id.length) {
        this.event_id = event_id;
    } else {
        this.event_id = [ event_id ];
    }

    if (files.length) {
        this.files = files;
    } else {
        this.files = [ files ];
    }
}

module.exports = BestPractice;