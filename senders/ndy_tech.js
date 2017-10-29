var config = require('../config.js')
var SqlConnection = require('../helpers/sql_conn.js');

var _ = require('lodash');
var clockwork = require('clockwork')({ key: config.clockwork.key });


function NDYTechnology() { }
module.exports = NDYTechnology;


NDYTechnology.process = function() {
    SqlConnection.getSqlRequest((e, r) => {
        if (e) {
            console.log(e);
            return;
        }
        
        var query = `\
            SELECT \
                d.deceasedId, \
                d.firstName, \
                d.lastName, \
                d.phone, \
                n.Frequency \
            FROM [deceased] d (NOLOCK) \
            INNER JOIN [notDeadFrequency] n (NOLOCK) ON d.notDeadFrequencyId = n.notDeadFrequencyId \
            WHERE \
                d.deceased = 0 AND \
                ( \
                    (n.Frequency = 'daily' AND DATEADD(day, 1, ISNULL(d.LastLoginDate, GETUTCDATE())) < GETUTCDATE()) \
                    OR \
                    (n.Frequency = 'weekly' AND DATEADD(day, 7, ISNULL(d.LastLoginDate, GETUTCDATE())) < GETUTCDATE()) \
                    OR \
                    (n.Frequency = 'monthly' AND DATEADD(month, 1, ISNULL(d.LastLoginDate, GETUTCDATE())) < GETUTCDATE()) \
                    OR \
                    (n.Frequency = 'yearly' AND DATEADD(year, 1, ISNULL(d.LastLoginDate, GETUTCDATE())) < GETUTCDATE()) \
                ) \
                AND notDeadYet IS NULL`;

        r.query(query, (e, results) => {
            if (e) {
                console.log(e);
                return;
            }

            _.forEach(results.recordset, (v) => NDYTechnology.processNotDeadEvent(v, (e) => {
                if (e) { console.log(e); }
            }));
        });
    });
}

NDYTechnology.processDead = function() {
    SqlConnection.getSqlRequest((e, r) => {
        if (e) {
            console.log(e);
            return;
        }

        var query = `\
            SELECT \
                d.deceasedId, \
                d.firstName, \
                d.lastName, \
                d.phone \
            FROM [deceased] d (NOLOCK) \
            WHERE d.deceased = 0 AND notDeadYet IS NOT NULL AND notDeadYet < GETUTCDATE()`;

        r.query(query, (e, results) => {
            if (e) {
                console.log(e);
                return;
            }

            _.forEach(results.recordset, (v) => NDYTechnology.processDeadEvent(v, (e) => {
                if (e) { console.log(e); }
            }));
        });
    });
}

NDYTechnology.processNotDeadEvent = function(ndy, cb) {
    if (!ndy) {
        cb();
        return;
    }

    NDYTechnology.processNotDeadSms(ndy, (e) => cb(e));

    SqlConnection.getSqlRequest((e, r) => {
        if (e) {
            console.log(e);
            return;
        }

        var query = `\
            UPDATE [deceased]
            SET notDeadYet = DATEADD(day, 1, GETUTCDATE())
            WHERE deceasedId = ${ndy.deceasedId}`

        if (query) {
            console.log('moving along not dead yet check');
            r.query(query, (e, results) => { console.log(e); });
        }
    });
}

NDYTechnology.processDeadEvent = function(ndy, cb) {
    if (!ndy) {
        cb();
        return;
    }

    NDYTechnology.processDeadSms(ndy, (e) => cb(e));

    SqlConnection.getSqlRequest((e, r) => {
        if (e) {
            console.log(e);
            return;
        }

        var query = `\
            UPDATE [deceased]
            SET notDeadYet = NULL, deceased = 1, dateOfDeath = GETUTCDATE()
            WHERE deceasedId = ${ndy.deceasedId}`

        if (query) {
            console.log('aww, they died :(');
            r.query(query, (e, results) => { console.log(e); });
        }
    });
}

NDYTechnology.processNotDeadSms = function(ndy, cb) {
    var msg = `Hi ${ndy.firstName}, DeathNotez here! This is your ${ndy.Frequency} alive check :) Please login to your account within the next 24 hours`;
    clockwork.sendSms({ To: ndy.phone, Content: msg }, function(e, r) {
        if (e) {
            cb(`Something went wrong: ${e}`);
            return;
        }

        console.log(`Message sent to ${r.responses[0].to} (${ndy.firstName} ${ndy.lastName})`);
        console.log(`MessageId was ${r.responses[0].id}`);

        cb();
    });
}

NDYTechnology.processDeadSms = function(ndy, cb) {
    var msg = `Hi ${ndy.firstName}, DeathNotez here again! We regret to inform you that it appears you have now died :(`;
    clockwork.sendSms({ To: ndy.phone, Content: msg }, function(e, r) {
        if (e) {
            cb(`Something went wrong: ${e}`);
            return;
        }

        console.log(`Message sent to ${r.responses[0].to} (${ndy.firstName} ${ndy.lastName})`);
        console.log(`MessageId was ${r.responses[0].id}`);

        cb();
    });
}