// dotenv as soon as possible
import 'dotenv/config';
//

import { Request, Response, Application } from 'express';

//import express = require('express');
//import path = require('path');
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import {dirname} from 'path';
import { fileURLToPath } from 'url';
const __dirname = process.cwd();

import session from 'express-session';
//const flash = require('express-flash');

import {Zebra, text_command} from './scripts/cmd_multitool.js';

import {router as destinyRouter} from './routes/destiny_two.js';

//import admin_req from './routes/admin_portal.js';
//var adminRouter = admin_req.router;


import {destiny_data} from './scripts/destiny_data.js';
import {DestinyRequest} from './scripts/destiny_request.js';
import {destiny_commands} from './scripts/destiny_commands.js';
//idk why it won't let me use the {router, destiny_commands} syntax. mysterious error.

export const app : Application = express();
export default app;
//console.log("in app. path: ", __dirname);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}));
//app.use(flash());

app.use(express.static(path.join(__dirname, 'public')))


//app.use('/', homeRouter);
app.use('/', destinyRouter);
//app.use('/', adminRouter);

async function loop_ask()
{
    var stripes = new Zebra();
    for(let i = 0; i < 10; i++)
    {
        var important_data = await Zebra.run();
        important_data += "0";
    }
}
text_command.getCommand['show']!.execute = destiny_commands.destiny_show;
text_command.getCommand['manifest']!.execute = destiny_commands.destiny_manifest;
text_command.getCommand['read']!.execute = destiny_commands.destiny_read;
text_command.getCommand['save']!.execute = destiny_commands.destiny_save;
text_command.getCommand['drop']!.execute = destiny_commands.destiny_drop;
text_command.getCommand['create']!.execute = destiny_commands.destiny_create;
setTimeout(loop_ask, 5000);

//const server = app.listen(3000, () => {
//    console.log(`The application started on port ${server.address().port}`);
//});
(async () => {
    await destiny_data.loadAllFiles();
    if(process.env.DOWNLOAD == 1){
        await DestinyRequest.fetchManifest();
    }
    if(process.env.SAVE_STATIC == 1){
        await destiny_commands.destiny_save("everything","");
    }
})();

//module.exports = app;