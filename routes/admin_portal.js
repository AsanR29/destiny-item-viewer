const express = require('express');
const session = require('express-session');
var router = express.Router();

const DD = require("../scripts/destiny_data");
const DestinyRequest = require("../scripts/destiny_request");
const {Zebra, text_command}  = require("../scripts/cmd_multitool");

router.post('/endpoint', async function(req, res, next) {
    console.log("Endpoint accessed.");
    try{
        let data = req.body;
        if(data["password"] == DD.ENDPOINT_PASSWORD) {
            let cmd_tokens = data["command"];
            await Zebra.first_responder(cmd_tokens);
            return;
        }
        else{ return res.status(400).json({error:"Wrong password."}); }
    } catch(err){ return res.status(400).json({error:err}); }
});


router.get('/loginadmin')

module.exports = {"router":router};