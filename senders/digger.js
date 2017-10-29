var config = require('../config.js')
var SqlConnection = require('../helpers/sql_conn.js');

var _ = require('lodash');
var clockwork = require('clockwork')({ key: config.clockwork.key });


function Digger() { }
module.exports = Digger;


Digger.process = function() {
    SqlConnection.getSqlRequest((e, r) => {
        if (e) {
            console.log(e);
            return;
        }
        
        // get the deceased
        var query = `\
            SELECT
                d1.deceasedId AS deceasedId1,
                d2.deceasedId AS deceasedId2
            FROM [deceased] d1
            INNER JOIN [deceased] d2 ON CAST(d1.dateOfDeath AS DATE) = CAST(d2.dateOfDeath AS DATE) AND d1.deceasedId != d2.deceasedId
            WHERE
                d1.deceased = 1 AND d2.deceased = 1
                AND CAST(d1.dateOfDeath AS DATE) = CAST(DATEADD(day, -7, GETUTCDATE()) AS DATE)`;

        r.query(query, (e, results) => {
            if (e) {
                console.log(e);
                return;
            }

            _.forEach(results.recordset, (v) => Digger.processDeceased(v, (e) => {
                if (e) { console.log(e); }
            }));
        });
    });
}

Digger.processDeceased = function(match, cb) {
    if (!match) {
        cb();
        return;
    }

    SqlConnection.getSqlRequest((e, r) => {
        if (e) {
            console.log(e);
            return;
        }

        // get list of possible recipient matches
        var query = `\
            SELECT
                r1.firstName AS recipient1Name,
                r2.firstName AS recipient2Name,
                r1.senderNickName AS recipient1SenderNickName,
                r2.senderNickName AS recipient2SenderNickName,
                r1.phone AS recipient1Phone,
                r2.phone AS recipient2Phone
            FROM [recipient] r1
            INNER JOIN [recipient] r2 ON
                r1.DateOfBirth BETWEEN DATEADD(year, -5, r2.DateOfBirth) AND DATEADD(year, 5, r2.DateOfBirth) AND
                r1.recipientId != r2.recipientId
            WHERE
                r1.deceasedId = ${match.deceasedId1} AND
                r2.deceasedId = ${match.deceasedId2} AND
                r1.meetupEnabled = 1 AND r2.meetupEnabled = 1 AND
                r1.sex != r2.sex`;

        r.query(query, (e, results) => {
            if (e) {
                cb(e);
                return;
            }

            _.forEach(results.recordset, (v) => Digger.processRecipients(v, (e) => {
                cb(e);
            }));
        });
    });
}

Digger.processRecipients = function(match, cb) {
    if (!match) {
        cb();
        return;
    }

    Digger.processSms(match, (e) => cb(e));
}




Digger.processSms = function(match, cb) {
    var msg1 = `Hi ${match.recipient1Name}, ${match.recipient1SenderNickName} thought you might like to connect with others. Try connecting with ${match.recipient2Name} on ${match.recipient2Phone}, as they have also recently lost a loved one`
    var msg2 = `Hi ${match.recipient2Name}, ${match.recipient2SenderNickName} thought you might like to connect with others. Try connecting with ${match.recipient1Name} on ${match.recipient1Phone}, as they have also recently lost a loved one`

    clockwork.sendSms({ To: match.recipient1Phone, Content: msg1 }, function(e, r) {
        if (e) {
            cb(`Something went wrong: ${e}`);
            return;
        }

        console.log(`Message sent to ${r.responses[0].to} (${match.recipient1Name})`);
        console.log(`MessageId was ${r.responses[0].id}`);

        clockwork.sendSms({ To: match.recipient2Phone, Content: msg2 }, function(e, r) {
            if (e) {
                cb(`Something went wrong: ${e}`);
                return;
            }

            console.log(`Message sent to ${r.responses[0].to} (${match.recipient2Name})`);
            console.log(`MessageId was ${r.responses[0].id}`);
            
            cb();
        })
    });
}