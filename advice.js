var Constants = require('constants');

function Advice(trigger_id, type, evidence) {
    // this.multi = false;
    this.trigger_id = trigger_id;
    this.type = type;
    this.evidence = evidence;
}

module.exports = Advice;