const sql = require('mssql');
const config = require('../config');

function SqlConnection() { }
module.exports = SqlConnection;

let connection = null;

SqlConnection.getSqlRequest = function(cb) {
    //try {
    //    sql.close();
    //} catch(err) { }

    if (connection) {
        cb(null, new sql.Request());
        return;
    }
    
    connection = sql.connect(config.mssql, (err) => {
        cb(err, (err ? null : new sql.Request()));
    });
}