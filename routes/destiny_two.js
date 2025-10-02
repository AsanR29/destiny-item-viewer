const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
var router = express.Router();

var http = require('http');
const { URLSearchParams } = require('url');
const fs = require('node:fs');
const path = require('node:path');

const DD = require("../scripts/destiny_data");
const DestinyRequest = require("../scripts/destiny_request");
const {Zebra, text_command}  = require("../scripts/cmd_multitool");

const {DestinyPlayer,PlayerSession} = require("../scripts/destiny_player");

//routes
router.get('/',  function(req, res, next) {
    res.render('destiny/destiny_homepage', { title: "Destiny Two", unique_users: 3 } );
});

router.get('/login', function(req, res, next) {
    res.render('destiny/destiny_login', { title: "Bungie Account", form_type:'Log in' } );
});
router.get('/loginguest', async function(req, res, next) {
    let guest_form = {  // My account.
        "displayName": "Nasa2907",
        "displayNameCode": "1043"
    };
    let result = await loginSequence(req, res, guest_form, "login");
    if(result != true && "is_error" in result) { result.next_function(res); return; }
    //res.redirect('/vault');
});

async function loginSequence(req, res, form_body, type) {
    let session_id = req.sessionID;
    let operation = new DestinyRequest(session_id, false);
    operation.run_info["type"] = type;
    let result_1 = await operation.loginUser(form_body);
    if(!result_1 || "is_error" in result_1) { 
        switch(type){
            case "login": res.redirect('/login'); break
            case "signup": res.redirect('/signup'); break;
        }
        req.flash("warning", "Failed to log in");
        return false;
    }
    req.session.player = new PlayerSession(req.body.displayName,req.body.displayNameCode,req.body.password);
    req.session.save();

    let result_2 = await operation.authenticate_1(res,session_id);  //this contains a res.redirect
    return result_2;
};

router.post('/login', function(req, res, next) {
    loginSequence(req, res, req.body, "login");
    return;
});
router.get('/signup', function(req, res, next) {
    res.render('destiny/destiny_login', { title: "Bungie Account", form_type:'Sign up' } );
});
router.post('/signup', async function(req, res, next) {
    loginSequence(req, res, req.body, "signup");
    return;
});

router.get('/authenticate', authenticate_call);

async function authenticate_call(req,res,next) {
    let operation;
    try{
        operation = DD.auth_processes[req.sessionID];
        let result_1 = await operation.authenticate_2(req.query);
        
        if(result_1 == false || "is_error" in result_1) { 
            res.redirect('/login');
            req.flash("warning", "Failed to log in");
            return;
        }
        let player = DD.player_directory[req.sessionID];
        let result_2 = false;
        switch(operation.run_info["type"]) {
            case "login":
                result_2 = await player.login(req.session.player);
                if(result_2 == false){ res.redirect('/login'); }
                break;
            case "signup":
                result_2 = await player.signup(req.session.player);
                if(result_2 == false){ res.redirect('/signup'); }
                break;
        }
        if(result_2 == false){ return; }
        
        //
        let result_3 = await operation.getCharacters();
        let result_4 = await operation.getItems(result_3);
        let result_5 = await DD.getWeaponHashes(req.sessionID, result_4);
        req.session.save(); //player.login / player.signup make changes to it

        res.redirect('/vault'); // later make it /player
        req.flash("info", "Logged in");
    } catch(err) { 
        console.log(err);
        res.render('destiny/destiny_homepage', { title: "Authentication FAIL!", unique_users: 3 } );
    } finally {
        if(req.sessionID in DD.auth_processes) {
            delete DD.auth_processes[req.sessionID];
        }
        return;
    }
};

router.get('/player', function(req, res, next) {
    res.render('destiny/destiny_player', { title: "Your Account" } );
});

async function vault_call(req, res, next){
    if( !(req.session.player && req.session.player.logged_in) ){
        res.redirect('/login'); return;
    } //else: they're logged_in
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
    if( !(req.session.player && req.session.player.logged_in) ){
        res.redirect('/login'); return;
    } //else: they're logged_in
    let player = DD.player_directory[req.sessionID];

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

    res.render('destiny/gun_model', { title: "Weapon Data", gun_data: gun, socket_data: perk_data} );
});

router.get('/random', function(req, res, next) {
    let keys = Object.keys(DD.weapon_directory);
    let max = keys.length;
    let id = Math.floor(Math.random() * max);
    
    res.redirect(`/model/${keys[id]}`);
});

router.get('/ref', function(req, res, next) {
    res.render('destiny/destiny_ref_page', { title: "Your Account"} );
});


module.exports = {"router":router};
