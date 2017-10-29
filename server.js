try {
    var config = require('./config.js');
    var EventSender = require('./senders/events.js');
    var NDYTechnology = require('./senders/ndy_tech.js');
    var Digger = require('./senders/digger.js');

    var http = require('http');
    var path = require('path');
    var express = require('express');

    setInterval(EventSender.process, 10000);
    setInterval(NDYTechnology.process, 15000);
    setInterval(NDYTechnology.processDead, 20000);
    setInterval(Digger.process, 25000);

    var app = express();
    app.set('port', (process.env.PORT || config.port));

    http.createServer(app).listen(app.get('port'), function() {
        console.log('Running on http://localhost:' + app.get('port'));
    });

    console.log('service started');
}
catch (err) {
    console.log(err);
    throw err;
}