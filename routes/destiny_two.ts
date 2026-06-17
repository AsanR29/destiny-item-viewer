import { Request, Response, NextFunction } from 'express';
import express from 'express';
import session from 'express-session';

import { instanceToPlain } from 'class-transformer';
// Define the session data type
declare module 'express-session' {
    interface SessionData {
        player: any;
        isAuthenticated: boolean;
    }
}

export var router = express.Router();

//var http = require('http');
//const { URLSearchParams } = require('url');
//const fs = require('node:fs');
//const path = require('node:path');

import {destiny_data as DD, destiny_weapon} from "../scripts/destiny_data.js";
import {DestinyRequest} from "../scripts/destiny_request.js";

import {DestinyPlayer,PlayerSession} from "../scripts/destiny_player.js";

const destinyPREFIX = '/destiny/';
const URL = Object.freeze({
    HOME: destinyPREFIX+    "",
    LOGIN: destinyPREFIX+   "login",
    SIGNUP: destinyPREFIX+  "signup",
    GUEST: destinyPREFIX+   "loginguest",
    AUTH: destinyPREFIX+    "authenticate",
    PLAYER: destinyPREFIX+  "player",
    VAULT: destinyPREFIX+   "vault",
    SOCKETS: destinyPREFIX+ "sockets",
    GUN: destinyPREFIX+     "gun",
    MODEL: destinyPREFIX+   "model",
    RANDOM: destinyPREFIX+  "random",
    //: "",
});
//routes
router.get(URL.HOME,  function(req : Request,res : Response, next : NextFunction) {
    res.render('destiny/destiny_homepage', { title: "Destiny Two", unique_users: 3 } );
});

router.get(URL.LOGIN, function(req : Request,res : Response, next : NextFunction) {
    res.render('destiny/destiny_login', { title: "Bungie Account", form_type:'Log in' } );
});
router.get(URL.GUEST, async function(req : Request,res : Response, next : NextFunction) {
    let guest_form = {  // My account.
        "displayName": "Nasa2907",
        "displayNameCode": "1043"
    };
    let result = await loginSequence(req, res, guest_form, "loginguest");
    if(result == true){ res.redirect(URL.VAULT); return; }
    //else if(result != false && "is_error" in result) { result.next_function(res); }
    return;
});

async function loginSequence(req : Request, res : Response, form_body : any, type : string) {
    let session_id = req.sessionID;
    let operation = new DestinyRequest(session_id, false);
    operation.run_info["type"] = type;
    let result_1 = await operation.loginUser(form_body);
    if(!result_1 || "is_error" in result_1) { 
        if("is_error" in result_1){
            result_1.next_function(res);
        } else{
            switch(type){
                case "login": case "loginguest": res.redirect(URL.LOGIN); break
                case "signup": res.redirect(URL.SIGNUP); break;
            }
            //req.flash("warning", "Failed to log in");
        }
        return false;
    }
    req.session.player = new PlayerSession(form_body.displayName,form_body.displayNameCode,form_body.password);
    let result_2 = false;
    if(type != "loginguest"){
        result_2 = await operation.authenticate_1(res,session_id);  //this contains a res.redirect
    } else { 
        req.session.player.logged_in = true;
        result_2 = true; 
        await inventory_call(operation, req.sessionID);
    }
    req.session.save();
    return result_2;
};

router.post(URL.LOGIN, function(req : Request,res : Response, next : NextFunction) {
    loginSequence(req, res, req.body, "login");
    return;
});
router.get(URL.SIGNUP, function(req : Request,res : Response, next : NextFunction) {
    res.render('destiny/destiny_login', { title: "Bungie Account", form_type:'Sign up' } );
});
router.post(URL.SIGNUP, async function(req : Request,res : Response, next : NextFunction) {
    loginSequence(req, res, req.body, "signup");
    return;
});

router.get(URL.AUTH, authenticate_call);
router.get(URL.AUTH+'/', authenticate_call);

async function inventory_call(operation : any, req_session_id : string) {
    try{
        let result_3 = await operation.getCharacters();
        let result_4 = await operation.getItems(result_3);
        let result_5 = await DD.getWeaponHashes(req_session_id, result_4);
        return result_5;
    } catch(err){ console.log(err); }
    return false;
}
async function authenticate_call(req : Request,res : Response, next : NextFunction) {
    let operation;
    try{
        operation = DD.auth_processes[req.sessionID];
        let result_1 = await operation.authenticate_2(req.query);
        
        if(result_1 == false || "is_error" in result_1) { 
            res.redirect(URL.LOGIN);
            //req.flash("warning", "Failed to log in");
            return;
        }
        let player = DD.player_directory[req.sessionID];
        let result_2 = false;
        switch(operation.run_info["type"]) {
            case "login":
                result_2 = await player.login(req.session.player);
                if(result_2 == false){ res.redirect(URL.LOGIN); }
                break;
            case "signup":
                result_2 = await player.signup(req.session.player);
                if(result_2 == false){ res.redirect(URL.SIGNUP); }
                break;
        }
        if(result_2 == false){ return; }
        
        //
        await inventory_call(operation, req.sessionID);
        req.session.save(); //player.login / player.signup make changes to it

        res.redirect(URL.VAULT); // later make it /player
        //req.flash("info", "Logged in");
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

router.get(URL.PLAYER, function(req : Request,res : Response, next : NextFunction) {
    res.render('destiny/destiny_player', { title: "Your Account" } );
});

async function vault_call(req : Request,res : Response, next : NextFunction){
    if( !(req.session.player && req.session.player.logged_in) ){
        res.redirect(URL.LOGIN); return;
    } //else: they're logged_in
    let filter : string = req.params.filter as string;
    let inventory_data : any = {};
    let gun_lookup : any = {};

    let player = DD.player_directory[req.sessionID];
    if(player){
        let vault = player.vault;
        let vault_keys = Object.keys(vault);
        let item_data = {};
        let gun : any; let entry;
        for(let i = 0; i < vault_keys.length; i++){
            let vault_key = vault_keys[i];
            if(!vault_key){ continue; }
            entry = vault[vault_key];
            gun = DD.weapon_directory[entry.item_hash];
            if(!gun){ continue; }
            if(gun.stage == 1){ gun.parseGunData(); }

            //entry.wp_data = {...entry.wp_data};
            entry.wp_data = instanceToPlain(entry.wp_data);
            inventory_data[vault_key] = entry;
            //gun.wp_data = {...gun.wp_data};
            gun.wp_data = instanceToPlain(gun.wp_data);
            gun_lookup[entry.item_hash] = gun;
        }
    }
    res.render('destiny/destiny_vault', { title: "Your vault", vault_data: inventory_data, gun_lookup: gun_lookup, filter: (filter == '' ? false : filter)} );
}
router.get(URL.VAULT, vault_call);
router.get(URL.VAULT+'/:filter', vault_call);

/*
router.get(URL.SOCKETS, function(req : Request,res : Response, next : NextFunction){
    res.render('destiny/destiny_sockets', { title: "Sockets", socket_data: socket_directory, filter: false} );
});
router.get(URL.SOCKETS+'/:filter', function(req : Request,res : Response, next : NextFunction){
    res.render('destiny/destiny_sockets', { title: "Sockets", socket_data: socket_directory, filter: req.params.filter} );
});
*/

router.get(URL.GUN+'/:gun_id', async function(req : Request,res : Response, next : NextFunction) {
    let gun_id = req.params.gun_id;
    if(!gun_id){ res.redirect(URL.VAULT); return;} else{ gun_id = gun_id as string;}
    if( !(req.session.player && req.session.player.logged_in) ){
        res.redirect(URL.LOGIN); return;
    } //else: they're logged_in
    let player = DD.player_directory[req.sessionID];

    let vault = player.vault;
    let unique = vault[gun_id];
    let gun = DD.weapon_directory[unique.item_hash];

    let text = false;
    let desc = false;
    if(gun.wp_data["lore"] && DD.lore_directory[gun.wp_data["lore"]]){
        text = DD.lore_directory[gun.wp_data["lore"]];
    }
    else{ text = false; }
    gun.wp_data["loreDesc"] = text;

    if(unique.stage != 4){ 
        let operation = new DestinyRequest(req.sessionID, false);
        let instance_data = await operation.getItemInstance(unique.instance_hash);
        let perk_array = []; perk_array = instance_data.Response.sockets.wep_data.sockets;   //wow
        
        await unique.parseGunUnique(perk_array); 
    }

    let perk_data : {[key:string]:any} = {};
    let gun_data = unique.unique;
    let perk_keys = Object.keys(gun_data.perk_pool);
    for(let i in perk_keys) {
        let key = perk_keys[i];
        if(!key){ continue; }
        let perk_hash = gun_data.perk_pool[key];
        perk_data[key] = [DD.getSocket(perk_hash)];
    }
    
    let similiar_guns = gun_data.similiarGunSets();
    let s_gun_keys = Object.keys(similiar_guns);
    for(let i in s_gun_keys) {
        let key = s_gun_keys[i];
        if(!key){ continue; }
        let rating = similiar_guns[key];
        similiar_guns[key] = DD.weapon_directory[key];
        similiar_guns[key]["rating"] = rating;
    }
    gun.wp_data = {...gun.wp_data};
    res.render('destiny/gun_individual', { title: "Weapon Data", gun_data: gun, socket_data: perk_data, similiar_guns: similiar_guns} );
});
router.get(URL.MODEL+'/:gun_id', async function(req : Request,res : Response, next : NextFunction) {
    let gun;
    let gun_id = req.params.gun_id;
    if(!gun_id){ res.redirect(URL.VAULT); return;} else{ gun_id = gun_id as string;}
    if( !(gun_id in DD.weapon_directory) || DD.weapon_directory[gun_id] == false) {
        let empty_weapon = new destiny_weapon(gun_id);
        await DD.defineWeapons([empty_weapon]);
    }
    gun = DD.weapon_directory[gun_id];

    switch(gun.stage) {
        case 1:
            gun.parseGunData();
        case 2:
            gun.parseGunSockets();
    }

    let text = false;
    let desc = false;
    let lore_hash : string | boolean = false;

    if("lore" in gun.wep_data){
        lore_hash = gun.wep_data["lore"];
        if(lore_hash){
            lore_hash = String(lore_hash); 
            text = DD.lore_directory[lore_hash];
        }
    }
    else{ text = false; }
    gun.wep_data["loreDesc"] = text;

    let gun_sockets = [];
    let sock;
    let perk_hash; let perk;

    let perk_data : {[key:string]:any} = {};
    let perk_keys = Object.keys(gun.wep_data.perk_pool);
    for(let i in perk_keys) {
        let key = perk_keys[i];
        if(!key){ continue; }
        perk_data[key] = [];
        let perk_set = gun.wep_data.perk_pool[key];
        
        for(let entry of perk_set.entries()) {
            let perk_hash = entry[0];
            perk_data[key].push(DD.getSocket(perk_hash));
        }
    }
    gun.wp_data = {...gun.wp_data};
    res.render('destiny/gun_model', { title: "Weapon Data", gun_data: gun, socket_data: perk_data} );
});

router.get(URL.RANDOM, function(req : Request,res : Response, next : NextFunction) {
    let keys = Object.keys(DD.weapon_directory);
    let max = keys.length;
    let id = Math.floor(Math.random() * max);
    
    res.redirect(URL.MODEL+`/${keys[id]}`);
});

router.get('/ref', function(req : Request,res : Response, next : NextFunction) {
    res.render('destiny/destiny_ref_page', { title: "Your Account"} );
});

//module.exports = {"router":router};
