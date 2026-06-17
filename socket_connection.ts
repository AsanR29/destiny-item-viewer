import app from './app.js';
import fs from 'fs';
import https from 'https';
import http from 'http';

export var server : any= false;

if(process.env.USE_CERTIFICATES == 1){
    
    const options = {
        key: fs.readFileSync('/etc/letsencrypt/live/asanr.site/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/asanr.site/fullchain.pem')
    };

    server = https.createServer(options, app);
} else{
    server = http.createServer(app);
}

//module.exports = server;