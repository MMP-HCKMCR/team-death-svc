var config = require('../config.js')
var SqlConnection = require('../helpers/sql_conn.js');

var _ = require('lodash');
var clockwork = require('clockwork')({ key: config.clockwork.key });

function EventSender() { }
module.exports = EventSender;


EventSender.process = function() {
    SqlConnection.getSqlRequest((e, r) => {
        if (e) {
            console.log(e);
            return;
        }

        var query = "\
            SELECT \
                e.eventId, \
                e.eventTypeId, \
                e.annualRepeat, \
                e.SMS AS eventSms, \
                e.email AS eventEmail, \
                e.twitter AS eventTwitter, \
                e.annualRepeat, \
                r.phone AS recipientPhone, \
                r.email AS recipientEmail, \
                r.twitter AS recipientTwitter, \
                r.firstName AS recipientFirstName, \
                r.lastName AS recipientLastName, \
                r.senderNickName, \
                d.phone AS deceasedPhone, \
                d.email AS deceasedEmail, \
                e.messageText \
            FROM [deceased] d (NOLOCK) \
            INNER JOIN [event] e (NOLOCK) ON d.deceasedId = e.deceasedId \
            INNER JOIN [recipient] r (NOLOCK) ON e.recipientId = r.recipientId \
            WHERE \
                d.deceased = 1 AND e.messageSent = 0 AND \
                (\
                    (e.eventTypeId != 4 AND e.eventDate < GETUTCDATE()) \
                    OR \
                    (e.eventTypeId = 4 AND DATEADD(minute, e.minsAfterDeath, d.dateOfDeath) < GETUTCDATE()) \
                )";

        r.query(query, (e, results) => {
            if (e) {
                console.log(e);
                return;
            }

            _.forEach(results.recordset, (v) => EventSender.processEvent(v, (e) => {
                if (e) { console.log(e); }
            }));
        });
    });
}


EventSender.processEvent = function(event, cb) {
    if (!event) {
        cb();
        return;
    }

    if (event.eventSms) {
        EventSender.processSms(event, (e) => cb(e));
    }

    if (event.eventEmail) {
        //EventSender.processEmail(event, (e) => cb(e));
    }

    SqlConnection.getSqlRequest((e, r) => {
        if (e) {
            console.log(e);
            return;
        }

        var query = '';

        if (event.eventTypeId == 4 || !event.annualRepeat) {
            query = `\
                UPDATE [event] \
                SET messageSent = 1 \
                WHERE eventId = ${event.eventId}`;
        }
        else {
            query = `\
                UPDATE [event] \
                SET eventDate = DATEADD(year, 1, eventDate) \
                WHERE eventId = ${event.eventId}`;
        }

        if (query) {
            console.log('completing message');
            r.query(query, (e, results) => { console.log(e); });
        }
    });
}

EventSender.processEmail = function(event, cb) {
    var sendgrid = require('sendgrid').mail;

    var from_email = new sendgrid.Email(event.deceasedEmail);
    var to_email = new sendgrid.Email(event.recipientEmail);
    var content = new sendgrid.Content("text/plain", event.messageText);
    var mail = new sendgrid.Mail(from_email, `From ${event.deceasedFirstName} ${event.deceasedLastName}`, to_email, content);

    var sg = require('sendgrid')(config.sendgrid.key);
    var req = sg.emptyRequest({
        method: 'POST',
        path: '/v3/mail/send',
        body: mail.toJSON()
    });

    sg.API(req, function(e, r) {
        if (e || (r.statusCode != 202 && r.statusCode != 200)) {
            cb((e || 'unexpected error when sending email'));
            return;
        }
        
        console.log(`Email sent to ${event.recipientEmail}`);
        cb();
    });
}

EventSender.processSms = function(event, cb) {
    clockwork.sendSms({ To: event.recipientPhone, Content: `${event.messageText}, ${event.senderNickName}` }, function(e, r) {
        if (e) {
            cb(`Something went wrong: ${e}`);
            return;
        }

        console.log(`Message sent to ${r.responses[0].to} (${event.recipientFirstName} ${event.recipientLastName})`);
        console.log(`MessageId was ${r.responses[0].id}`);

        cb();
    });
}