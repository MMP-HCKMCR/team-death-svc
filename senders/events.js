var config = require('../config.js')
var SqlConnection = require('../helpers/sql_conn.js');

var _ = require('lodash');
var clockwork = require('clockwork')({ key: config.clockwork.key });

function EventSender() { }
module.exports = EventSender;


EventSender.process = function() {
    console.log('processing...');

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
                r.phone, \
                r.email, \
                r.twitter, \
                r.firstName, \
                r.lastName, \
                m.messageText \
            FROM [deceased] d (NOLOCK) \
            INNER JOIN [event] e (NOLOCK) ON d.deceasedId = e.deceasedId \
            INNER JOIN [recipient] r (NOLOCK) ON e.recipientId = r.recipientId \
            INNER JOIN [message] m (NOLOCK) ON e.messageId = m.messageId \
            WHERE d.deceased = 1 AND e.eventDate < GETUTCDATE() AND e.messageSent = 0";

        r.query(query, (e, results) => {
            if (e) {
                console.log(e);
                return;
            }

            _.forEach(results.recordset, (v) => EventSender.processEvent(v));
        });
    });
}


EventSender.processEvent = function(event) {
    if (!event) {
        return;
    }

    clockwork.sendSms({ To: event.phone, Content: `${event.messageText} ${Date.now()}` }, function(e, r) {
        if (e) {
            console.log(`Something went wrong: ${e}`);
            return;
        }

        console.log(`Message sent to ${r.responses[0].to} (${event.firstName} ${event.lastName})`);
        console.log(`MessageId was ${r.responses[0].id}`);

        SqlConnection.getSqlRequest((e, r) => {
            if (e) {
                console.log(e);
                return;
            }
    
            var query = `\
                UPDATE [event] \
                SET messageSent = 1 \
                WHERE eventId = ${event.eventId}`;
    
            r.query(query, (e, results) => {
                if (e) { console.log(e); }
            });
        });
    });
}