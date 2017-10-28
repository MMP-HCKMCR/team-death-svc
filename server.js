try {
    /////////////////////////////////////
    // config
    /////////////////////////////////////
    var config = require('./config.js');

    
    /////////////////////////////////////
    // load required libraries
    /////////////////////////////////////
    var http = require('http');
    var path = require('path');
    var express = require('express');
    var bodyParser = require('body-parser');


    /////////////////////////////////////
    // setup express
    /////////////////////////////////////
    var app = express();
    app.set('port', (process.env.PORT || config.port));

    // body JSON parsing
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));


    /////////////////////////////////////
    // load and setup API
    /////////////////////////////////////
    app.use('/rest/api', require('./rest/api.js')());
    

    /////////////////////////////////////
    // hook node onto ip:port
    /////////////////////////////////////    
    http.createServer(app).listen(app.get('port'), function() {
        console.log('Running on http://localhost:' + app.get('port'));
    });
}
catch (err) {
    console.log(err);
    throw err;
}