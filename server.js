try {
    var config = require('./config.js');
    var EventSender = require('./senders/events.js');

    setInterval(EventSender.process, 10000);

    console.log('service started');
}
catch (err) {
    console.log(err);
    throw err;
}