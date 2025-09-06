var express = require('express');
const mongoose = require('mongoose');
var router = express.Router();

var http = require('http');
const { URLSearchParams } = require('url');
const fs = require('node:fs');
const path = require('node:path');

const DD = require("../scripts/destiny_data");
const DestinyRequest = require("../scripts/destiny_request");
const {Zebra, text_command}  = require("../scripts/cmd_multitool");

const DestinyPlayer = require("../scripts/destiny_player");

//routes
router.get('/',  function(req, res, next) {
    res.render('destiny/destiny_homepage', { title: "Destiny Two", unique_users: 3 } );
});

router.get('/login', function(req, res, next) {
    res.render('destiny/destiny_login', { title: "Bungie Account Details" } );
});
router.get('/loginguest', async function(req, res, next) {
    let guest_form = {  // My account.
        "displayName": "Nasa2907",
        "displayNameCode": "1043"
    };
    let result = await loginSequence(req.sessionID,guest_form);
    if(result !== true && "is_error" in result) { result.next_function(res); return; }
    res.redirect('/vault');
});

async function loginSequence(session_id, form_body){
    let operation = new DestinyRequest(session_id, false);
    let result_1 = await operation.loginUser(form_body);
    if("is_error" in result_1) { return result_1; }
    let result_2 = await operation.getCharacters(result_1);
    let result_3 = await operation.getItems(result_2);
    let result_4 = await DD.getWeaponHashes(session_id, result_3);
    //console.log(DD.player_directory[session_id]);
    return true;
}
router.post('/login', function(req, res, next) {
    if(req){
        loginSequence(req.sessionID, req.body)
            .then(function(){
                req.flash("info", "Logged in");
                res.redirect('/vault'); // later make it /player
            })
            .catch(function(){
                req.flash("warning", "Failed to log in");
                res.redirect('/login');
                return;
            });
    }
    else{
        console.log("Hell");
        res.redirect('/login');
    }
});

router.get('/player', function(req, res, next) {
    res.render('destiny/destiny_player', { title: "Your Account"} );
});

async function vault_call(req, res, next){
    let filter = req.params.filter;
    let inventory_data = {};
    let gun_lookup = {};

    let player = DD.player_directory[req.sessionID];
    if(player){
        let vault = player.vault;
        let vault_keys = Object.keys(vault);
        let item_data = {};
        let gun = {}; let entry;
        for(let i = 0; i < vault_keys.length; i++){
            entry = vault[vault_keys[i]];
            gun = DD.weapon_directory[entry.item_hash];
            if(!gun){ continue; }
            if(gun.stage == 1){ gun.parseGunData(); }

            inventory_data[vault_keys[i]] = entry;
            gun_lookup[entry.item_hash] = gun;
        }
    }
    if(!filter){ filter = false; }
    res.render('destiny/destiny_vault', { title: "Your vault", vault_data: inventory_data, gun_lookup: gun_lookup, filter: filter} );
}
router.get('/vault', vault_call);
router.get('/vault/:filter', vault_call);

router.get('/sockets', function(req, res, next){
    res.render('destiny/destiny_sockets', { title: "Sockets", socket_data: socket_directory, filter: false} );
});
router.get('/sockets/:filter', function(req, res, next){
    res.render('destiny/destiny_sockets', { title: "Sockets", socket_data: socket_directory, filter: req.params.filter} );
});

router.get('/gun/:gun_id', async function(req, res, next) {
    let player = DD.player_directory[req.sessionID];
    // if(!player){ res.redirect("/login"); return; }
    let vault = player.vault;
    let unique = vault[req.params.gun_id];
    let gun = DD.weapon_directory[unique.item_hash];

    let text = false;
    let desc = false;
    if(gun["lore"] && DD.lore_directory[gun["lore"]]){
        text = DD.lore_directory[gun["lore"]];
    }
    else{ text = false; }
    gun["loreDesc"] = text;

    if(unique.stage != 4){ 
        let operation = new DestinyRequest(req.sessionID, false);
        let instance_data = await operation.getItemInstance(unique.instance_hash);
        let perk_array = []; try{ perk_array = instance_data.Response.sockets.data.sockets; } catch{ perk_array = false; }   //wow
        
        await unique.parseGunUnique(perk_array); 
    }

    let perk_data = {};
    let perk_keys = Object.keys(unique.perk_pool);
    for(let i in perk_keys) {
        let key = perk_keys[i];
        let perk_hash = unique.perk_pool[key];
        perk_data[key] = [DD.getSocket(perk_hash)];
    }
    
    let similiar_guns = unique.similiarGunSets();
    s_gun_keys = Object.keys(similiar_guns);
    for(let i in s_gun_keys) {
        let key = s_gun_keys[i];
        similiar_guns[key] = DD.weapon_directory[similiar_guns[key]];
    }

    res.render('destiny/gun_individual', { title: "Weapon Data", gun_data: gun, socket_data: perk_data, similiar_guns: similiar_guns} );
});
router.get('/model/:gun_id', async function(req, res, next) {
    let gun;
    if( !(req.params.gun_id in DD.weapon_directory) || DD.weapon_directory[req.params.gun_id] == false) {
        await DD.defineWeapons([{"itemHash":req.params.gun_id}]);
    }
    gun = DD.weapon_directory[req.params.gun_id];

    let text = false;
    let desc = false;
    if("lore" in gun && gun["lore"] && DD.lore_directory[gun["lore"]]){
        text = DD.lore_directory[gun["lore"]];
    }
    else{ text = false; }
    gun["loreDesc"] = text;

    let gun_sockets = [];
    let sock;
    let perk_hash; let perk;

    switch(gun.stage) {
        case 1:
            gun.parseGunData();
        case 2:
            gun.parseGunSockets();
    }

    let perk_data = {};
    let perk_keys = Object.keys(gun.perk_pool);
    for(let i in perk_keys) {
        let key = perk_keys[i];
 
        perk_data[key] = [];
        let perk_set = gun.perk_pool[key];
        
        for(let entry in perk_set) {
            let perk_hash = perk_set[entry];
            perk_data[key].push(DD.getSocket(perk_hash));
        }
    }

    console.log(perk_data);
    res.render('destiny/gun_model', { title: "Weapon Data", gun_data: gun, socket_data: perk_data} );
});

router.get('/random', function(req, res, next) {
    let keys = Object.keys(DD.weapon_directory);
    let max = keys.length;
    let id = Math.floor(Math.random() * max);
    
    res.redirect(`/model/${keys[id]}`);
});

router.post('/endpoint', function(req, res, next) {
    let data = req.body;
    if(data["password"] == DD.ENDPOINT_PASSWORD) {
        let cmd_tokens = data["command"];
        Zebra.first_responder(cmd_tokens);
        res.render("successful"); return;
    }
    res.render("fail");
});

router.get('/ref', function(req, res, next) {
    res.render('destiny/destiny_ref_page', { title: "Your Account"} );
});


module.exports = {"router":router};
