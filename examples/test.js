var c = require('./Console.js');
var blpapi = require('blpapi');

var hp = c.getHostPort();
var ao = 'AuthenticationMode=APPLICATION_ONLY;' +
         'ApplicationAuthenticationType=APPNAME_AND_KEY;' +
         'ApplicationName=blp-test:yannitest';
var session = new blpapi.Session({ serverHost: hp.serverHost,
                                   serverPort: hp.serverPort,
                                   authenticationOptions: ao });

var cid_authservice = 1;
var cid_refservice = 2;
var cid_mktdata = 3;
var cid_token = 4;
var cid_authorization = 5;
var cid_request = 6;

// GLOBAL
var IDENTITY;
var SERVICE_COUNTER = 0;

session.on('SessionStarted', function(m) {
    c.log(m);
    session.openService('//blp/apiauth', cid_authservice);
    session.openService('//blp/refdata', cid_refservice);
    session.openService('//blp/mktdata', cid_mktdata);
    //session.openService('//blp/popsvc', 99);
});

session.on('ServiceOpened', function(m) {
    console.log(m);
    if (m.correlations[0].value == cid_authservice) {
        SERVICE_COUNTER++;
    }
    if (m.correlations[0].value == cid_refservice) {
        SERVICE_COUNTER++;
    }
    if (m.correlations[0].value == cid_mktdata) {
        SERVICE_COUNTER++;
    }
    if (SERVICE_COUNTER === 3) {
        session.generateToken(cid_token);
    }
});

session.on('SessionTerminated', function(m) {
    session.destroy();
});

session.on('TokenGenerationSuccess', function(m) {
    console.log(m);
    if (m.correlations[0].value == cid_token) {
        var token = m.data.token;
        IDENTITY = session.createIdentity();
        session.sendAuthorizationRequest(token, IDENTITY, cid_authorization);
    }
});

session.on('TokenGenerationFailure', function(err) {
    console.log('Token generation error');
    console.log(err);
    session.stop();
});

session.on('AuthorizationSuccess', function(m) {
    console.log(m);
    if (m.correlations[0].value == cid_authorization) {
        //console.log(IDENTITY.isAuthorized('//blp/mktdata'));
        session.request('//blp/refdata',
                        'ReferenceDataRequest',
                        {
                            securities: ['IBM US Equity'],
                            fields: ['LAST_PRICE']
                        },
                        cid_request,
                        IDENTITY);
        /*session.request('//blp/popsvc',
                        'ReferenceDataRequest',
                        {
                            securities: ['IBM US Equity'],
                            fields: ['LAST_PRICE']
                        },
                        cid_request,
                        IDENTITY);*/

        session.subscribe([{
                                security: 'IBM US Equity',
                                correlation: 100,
                                fields: ['LAST_PRICE', 'BID', 'ASK']
                          }],
                          IDENTITY);
        
    }
});

session.on('AuthorizationFailure', function(err) {
    console.log(err);
    session.stop(); 
})

session.on('ReferenceDataResponse', function(m) {
    c.log(m);
    if (m.correlations[0].value === cid_request && m.eventType === 'RESPONSE') {
        session.stop();
    }
});

session.on('MarketDataEvents', function(m) {
    console.log(m);
});

session.on('SubscriptionFailure', function(err) {
    console.log(err);
    session.stop();
});

session.on('SubscriptionTerminated', function(err) {
    console.log(err);
    session.stop();
});

session.on('SubscriptionStarted', function(m) {
    console.log(m);
});

session.start();
