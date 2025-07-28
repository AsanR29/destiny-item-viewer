const express = require('express');
const path = require('path');
var cookieParser = require('cookie-parser');

var session = require('express-session');
var flash = require('express-flash');

const {Zebra, text_command} = require('./scripts/cmd_multitool');
var homeRouter = require('./routes/home');
const destiny_req = require('./routes/destiny_two');
//console.log("destiny_req: ",destiny_req);
var destinyRouter = destiny_req.router;
//console.log("destinyRouter: ", destinyRouter);
var destiny_commands = require('./scripts/destiny_commands'); //destiny_req.destiny_commands;
//idk why it won't let me use the {router, destiny_commands} syntax. mysterious error.

const app = express();
//console.log("in app. path: ", __dirname);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));
app.use(flash());

app.use(express.static(path.join(__dirname, 'public')))


//app.use('/', homeRouter);
app.use('/', destinyRouter);


async function loop_ask()
{
    var stripes = new Zebra();
    for(let i = 0; i < 10; i++)
    {
        var important_data = await Zebra.run();
        important_data += "0";
    }
}
text_command.show.execute = destiny_commands.destiny_show;
text_command.manifest.execute = destiny_commands.destiny_manifest;
text_command.read.execute = destiny_commands.destiny_read;
text_command.save.execute = destiny_commands.destiny_save;
//setTimeout(loop_ask, 5000);

//const server = app.listen(3000, () => {
//    console.log(`The application started on port ${server.address().port}`);
//});


module.exports = app;