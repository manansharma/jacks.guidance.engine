var uuid  = require('uuid');

var Guidance = function(trigger_id, trigger, category, event, title) {
    this.type = 'GUIDANCE';
    this.id = uuid.v4();
    this.trigger_id = trigger_id;
    this.trigger = trigger;
    this.category = category;
    this.event = event;
    this.title = title;
    this.advice = [];

    this.addAdvice = function(advice) {
        this.advice.push(advice);
    };
};

module.exports = Guidance;