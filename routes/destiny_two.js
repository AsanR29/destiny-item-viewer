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
    await loginSequence(req.sessionID,guest_form);
    res.redirect('/vault');
});

async function loginSequence(session_id, form_body){
    let operation = new DestinyRequest(session_id, false);
    let result_1 = await operation.loginUser(form_body);
    let result_2 = await operation.getCharacters(result_1);
    let result_3 = await operation.getItems(result_2);
    let result_4 = await DD.getWeaponHashes(session_id, result_3);
    console.log(DD.player_directory[session_id]);
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

    let player = DD.player_directory[req.sessionID];
    if(player){
        let vault = player.vault;
        let vault_keys = Object.keys(vault);
        let item_data = {};
        let gun = {};
        for(let i = 0; i < vault_keys.length; i++){
            if(DD.weapon_directory[vault_keys[i]] != false){ gun = DD.weapon_directory[vault_keys[i]]; }
            else{
                item_data = DD.item_definitions[vault_keys[i]];
                gun = DD.parseGunData(item_data);
            }
            inventory_data[vault_keys[i]] = gun;
        }
    }
    if(!filter){ filter = false; }
    res.render('destiny/destiny_vault', { title: "Your vault", vault_data: inventory_data, filter: filter} );
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
    let gun;
    if(DD.weapon_directory[req.params.gun_id] != false) {
        gun = DD.weapon_directory[req.params.gun_id];
    }
    else { 
        let item_data = DD.item_definitions[req.params.gun_id];
        gun = DD.parseGunData(item_data);
    }
    let text = false;
    let desc = false;
    if(gun["lore"] && DD.lore_directory[gun["lore"]]){
        text = DD.lore_directory[gun["lore"]];
    }
    else{ text = false; }
    gun["loreDesc"] = text;


    let player = DD.player_directory[req.sessionID];
    if(!player){ res.redirect("/login"); return; }
    let hash = req.params.gun_id;
    let itemInstanceId = player.vault[hash];
    console.log(itemInstanceId);

    let operation = new DestinyRequest(req.sessionID, false);
    console.log(typeof itemInstanceId);
    let instance_data = await operation.getItemInstance(itemInstanceId);
    console.log(instance_data);
    //await DD.printResults(instance_data);
    let gun_sockets = [];
    let perk_array = []; try{ perk_array = instance_data.Response.sockets.data.sockets;/*perks.data.perks;*/ } catch{ perk_array = false; }   //wow
    let perk_hash;
    let perk; let sock; let damageType;
    if(perk_array){
        for(let i = 0; i < perk_array.length; i++) {
            //console.log(perk_array[i]);
            perk_hash = perk_array[i]["plugHash"];//["perkHash"];
            sock = DD.item_definitions[perk_hash];//DD.plugset_definitions[perk_hash];//DD.perk_definitions[perk_hash];
            if(!sock){ continue; }
            if("damageTypeHash" in sock) {
                damageType = DD.damagetype_definitions[sock["damageTypeHash"]];
                console.log(damageType);
                sock = damageType;
            }
            if("plug" in sock) {
                let valid_category_hashes = [1744546145,2833605196,1806783418,7906839,164955586,3809303875,1257608559,2619833294,1757026848,577918720,1202604782,2718120384,3962145884,1041766312,683359327,1697972157];
                // this is intrinsics, barrels, magazines, frames, origins, bowstrings, arrows, scopes, batteries, stocks, tubes, magazines_gl, grips, blades, guards, hafts
                if(!valid_category_hashes.includes(sock.plug.plugCategoryHash)) {
                    console.log(sock.plug.plugCategoryIdentifier,sock.plug.plugCategoryHash);
                    continue;
                }
            }
            if (sock["isDisplayable"] == false){
                continue;
            }
            perk = DD.parseSocketData(sock);
            gun_sockets.push(perk);
        }
    }

    res.render('destiny/gun_individual', { title: "Weapon Data", gun_data: gun, socket_data: gun_sockets} );
});
router.get('/model/:gun_id', function(req, res, next) {
    let gun;
    if(req.params.gun_id in DD.weapon_directory && DD.weapon_directory[req.params.gun_id] != false) {
        gun = DD.weapon_directory[req.params.gun_id];
    }
    else { 
        let item_data = DD.item_definitions[req.params.gun_id];
        console.log(item_data);
        gun = DD.parseGunData(item_data);
    }
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
    if(req.params.gun_id in DD.weapon_to_socket) {
        for(let i = 0; i < DD.weapon_to_socket[req.params.gun_id].length; i++){
            sock = DD.item_definitions[DD.weapon_to_socket[req.params.gun_id][i]];

            if(sock){
                perk_hash = sock["perks"]["perkHash"];
                //perk = DD.perk_definitions[perk_hash];
                perk = DD.parseSocketData(sock);
                if(perk.itemCategoryHashes.includes(610365472) && !(perk.itemCategoryHashes.includes(1052191496))){
                    gun_sockets.push(perk);
                }
            }
        }
    }
    res.render('destiny/gun_model', { title: "Weapon Data", gun_data: gun, socket_data: gun_sockets} );
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
