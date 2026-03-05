var app = require('./app');
var fs = require('fs');

var server = false;

if(process.env.USE_CERTIFICATES == 1){
    var https = require('https');
    const options = {
        key: fs.readFileSync('/etc/letsencrypt/live/asanr.site/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/asanr.site/fullchain.pem')
    };

    server = https.createServer(options, app);
} else{
    var http = require('http');
    server = http.createServer(app);
}

module.exports = server;