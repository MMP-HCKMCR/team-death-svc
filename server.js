try {
    /////////////////////////////////////
    // config
    /////////////////////////////////////
    var config = require('./config.js');

    setInterval(() => {

    }, 60000);

    console.log('service started');
}
catch (err) {
    console.log(err);
    throw err;
}