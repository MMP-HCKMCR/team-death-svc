// libs
var express = require('express');

// express router
var router = express.Router();

module.exports = function() {

    router.get('/', function (req, res) {
        res.json('Hello World!');
    });

    return router;
}
