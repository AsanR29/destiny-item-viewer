var express = require('express');
const mongoose = require('mongoose');
var router = express.Router();

var http = require('http');
const { URLSearchParams } = require('url');
const fs = require('node:fs');
const path = require('node:path');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const API_KEY = process.env.API_KEY;

const player_directory = {};
var next_id = 0;
const weapon_directory = {};
const categorised_guns = {};
const lore_directory = {};
const socket_directory = {};
const categorised_sockets = {};

const socket_to_weapon = {};
const weapon_to_socket = {};

const item_definitions = {};
const sockettype_definitions = {};
const perk_definitions = {};
const plugset_definitions = {};

// MANIFEST ZONE
//destiny_commands.destiny_manifest("","");
// load saved weapon data
async function loadAllFiles(){
    let load_result = false;
    try{ loadFromFile("weapon_directory", weapon_directory); }
    catch { console.log("Error while loading weapon_directory."); }
    // load saved lore data
    load_result = false;
    try { load_result = await loadFromFile("lore_directory", lore_directory); }
    catch { console.log("Error while loading lore_directory."); }
    if(load_result == false){ destiny_commands.destiny_manifest("lore",""); }
    // load saved socket data
    try { loadFromFile("socket_directory", socket_directory); }
    catch { console.log("Error while loading socket_directory."); }
    // etc
    try { loadFromFile("socket_to_weapon", socket_to_weapon); }
    catch { console.log("Error while loading socket_to_weapon."); }
    // etc
    try { loadFromFile("weapon_to_socket", weapon_to_socket); }
    catch { console.log("Error while loading weapon_to_socket."); }
    // ALL item definitions...?
    load_result = false;
    try { load_result = await loadFromFile("DestinyInventoryItemDefinition", item_definitions); }
    catch { console.log("Error while loading DestinyInventoryItemDefinition."); }
    if(load_result == false){ destiny_commands.destiny_manifest("weapon","definitions"); }
    // ALL socket type definitions
    load_result = false;
    try { load_result = await loadFromFile("DestinySocketTypeDefinition", sockettype_definitions); }
    catch{ console.log("Error while loading DestinySocketTypeDefinition."); }
    if(load_result == false){ destiny_commands.destiny_manifest("sockettype",""); }
    // ALL perk definitions...?
    load_result = false;
    try { load_result = await loadFromFile("DestinySandboxPerkDefinition", perk_definitions); }
    catch { console.log("Error while loading DestinySandboxPerkDefinition."); }
    if(load_result == false){ destiny_commands.destiny_manifest("socket","definitions"); }
    // ALL plugset (randomised perk collection) definitions
    load_result = false;
    try { load_result = await loadFromFile("DestinyPlugSetDefinition", plugset_definitions); }
    catch { console.log("Error while loading DestinyPlugSetDefinition."); }
    if(load_result == false){ destiny_commands.destiny_manifest("plugset",""); }
}

let folder_path = path.resolve(__dirname, "../static_data");
console.log(folder_path);
if (!fs.existsSync(folder_path)) {
    fs.mkdirSync("static_data");
    console.log("DOES IT EXIST: ", fs.existsSync(folder_path));
}
path.resolve(__dirname, "../routes");
loadAllFiles();
console.log(DISCORD_TOKEN, CLIENT_ID, CLIENT_SECRET, API_KEY);
//routes

router.get('/',  function(req, res, next) {
    res.render('destiny/destiny_homepage', { title: "Destiny Two", unique_users: 3 } );
});

router.get('/login', function(req, res, next) {

    res.render('destiny/destiny_login', { title: "Get in" } );
});

async function loginUser(session_id, form) {
    console.log(" LOG IN USER ");
    const base_auth_url = "https://www.bungie.net/en/OAuth/Authorize";
    const token_url = "https://www.bungie.net/platform/app/oauth/token/";

    //dictionary to hold extra headers
    const HEADERS = {"X-API-Key":API_KEY};
    membershipType = "All";

    url = 'https://www.bungie.net/platform/Destiny2/SearchDestinyPlayerByBungieName/' + membershipType + '/';
    User = {"displayName":form.displayName, "displayNameCode":form.displayNameCode};
    console.log("session_id ",session_id);
    player_directory[session_id] = {
        "displayName": form.displayName,
        "displayNameCode": form.displayNameCode
    };

    await create(session_id, url=url,api_key=API_KEY, {
        "displayName": form.displayName,
        "displayNameCode": form.displayNameCode
    },
       getCharacters, "POST"
    );
    return true;
}

router.post('/login', function(req, res, next) {
    if(req){
        loginUser(req.sessionID, req.body)
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
    filter = req.params.filter;
    inventory_data = {};

    player = player_directory[req.sessionID];
    if(player && ("100" in player)){ 
        vault = player["100"];
        vault_keys = Object.keys(vault);
        for(let i = 0; i < vault_keys.length; i++){
            item_data = item_definitions[vault_keys[i]];
            gun = parseGunData(item_data);
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

router.get('/gun/:gun_id', function(req, res, next) {
    let gun = weapon_directory[req.params.gun_id];
    let text = false;
    let desc = false;
    if(gun["lore"] && lore_directory[gun["lore"]]){
        text = lore_directory[gun["lore"]];
        desc = text["displayProperties"]["description"];
        text["displayProperties"]["description"] = desc;
    }
    else{ text = false; }
    gun["loreDesc"] = text;

    let gun_sockets = [];
    let sock;
    for(let i = 0; i < weapon_to_socket[req.params.gun_id].length; i++){
        sock = socket_directory[weapon_to_socket[req.params.gun_id][i]];
        if(sock){
            if(sock.itemCategoryHashes.includes(610365472) && !(sock.itemCategoryHashes.includes(1052191496))){
                gun_sockets.push(sock);
            }
        }
    }

    res.render('destiny/gun_individual', { title: "Weapon Data", gun_data: gun, socket_data: gun_sockets} );
});
router.get('/model/:gun_id', function(req, res, next) {
    let item_data = item_definitions[req.params.gun_id];
    let gun = parseGunData(item_data);
    let text = false;
    let desc = false;
    console.log("lore: ", gun, gun["lore"]);
    if(gun["lore"] && lore_directory[gun["lore"]]){
        text = lore_directory[gun["lore"]];
        desc = text["displayProperties"]["description"];
        text["displayProperties"]["description"] = desc;
    }
    else{ text = false; }
    gun["loreDesc"] = text;

    let gun_sockets = [];
    let sock;
    let perk_hash; let perk;
    for(let i = 0; i < weapon_to_socket[req.params.gun_id].length; i++){
        sock = item_definitions[weapon_to_socket[req.params.gun_id][i]];

        if(sock){
            perk_hash = sock["perks"]["perkHash"];
            perk = perk_definitions[perk_hash];
            perk = parseSocketData(sock);
            if(perk.itemCategoryHashes.includes(610365472) && !(perk.itemCategoryHashes.includes(1052191496))){
                gun_sockets.push(perk);
            }
        }
    }
    res.render('destiny/gun_model', { title: "Weapon Data", gun_data: gun, socket_data: gun_sockets} );
});

router.get('/ref', function(req, res, next) {
    res.render('destiny/destiny_ref_page', { title: "Your Account"} );
});


async function loadFromFile(file_name, target_dict) {
    val = false;
    fs.readFile("static_data/"+file_name+".json", "utf8", async (err,data) => {
        if (err) {
            console.log("error?");
            console.error(err);
            //throw err;
        }
        // file written successfully
        val = data;
        console.log("success");

        try{
            input = JSON.parse(val);
        } catch(err){ console.log(err); return false; }
        console.log("input length ", input.length);
        if(target_dict.length == 0)
        { target_dict = input; }
        else {
            j_keys = Object.keys(input);
            console.log("j_keys length ",j_keys.length);
            for(let i = 0; i < j_keys.length; i++)
            {
                target_dict[j_keys[i]] = input[j_keys[i]];
                if(target_dict == weapon_directory){ await shelfWeapon(categorised_guns, j_keys[i], input[j_keys[i]]); }
                else if(target_dict == socket_directory){ await unpackSocket(categorised_sockets, j_keys[i], input[j_keys[i]])}
            }
        }
    });
    return true;
};
async function shelfWeapon(target_dict, hash, gun) {
    if(!(gun["itemTypeDesc"] in target_dict)){ target_dict[gun["itemTypeDesc"]] = []; }
    target_dict[gun["itemTypeDesc"]].push(hash);
};
async function unpackSocket(target_dict, hash, sockets) {
    let cats = sockets["itemCategoryHashes"];
    for(let i = 0; i < cats.length; i++){
        await shelfSocket(target_dict, hash, cats[i]);
    }
}
async function shelfSocket(target_dict, hash, socket) {
    if(!(socket in target_dict)){ target_dict[socket] = []; }
        target_dict[socket].push(hash);
}
async function writeToFile(file_name, data) {
    fs.writeFile("static_data/"+file_name+".json", JSON.stringify(data), { flag: 'w+' }, err => {
    if (err) {
        console.error(err);
    } else {
        // file written successfully
        console.log("success");
    }
    });
};

async function saveWeaponDefinitions(session_id, api_key, data) {
    console.log("Save Weapon Definitions.");
    let def_keys = Object.keys(data);
    let entry, string_key;
    for(let i = 0; i < def_keys.length; i++)
    {
        entry = data[def_keys[i]];
        string_key = def_keys[i].toString();
        if(!(string_key in item_definitions))
        {
            item_definitions[string_key] = entry;
        }
        if(!(string_key in weapon_directory) || weapon_directory[string_key] == false) {
            weapon_directory[string_key] = parseGunData(entry);
            item_data = weapon_directory[string_key];

            if(entry["itemType"] == 3){
                if("sockets" in entry){
                    let socket_array = entry["sockets"]["socketEntries"];
                    let plug_hash;
                    let perk_array;
                    for(let j = 0; j < socket_array.length; j++){
                        if("randomizedPlugSetHash" in socket_array[j]){
                            plug_hash = socket_array[j]["randomizedPlugSetHash"];

                            perk_array = plugset_definitions[plug_hash]["reusablePlugItems"];
                            if(!(string_key in weapon_to_socket)){ weapon_to_socket[string_key] = []; }
                            for(let k = 0; k < perk_array.length; k++){

                                perk_hash = perk_array[k]["plugItemHash"];
                                if(!(weapon_to_socket[string_key].includes(perk_hash))){
                                    weapon_to_socket[string_key].push(perk_hash); 
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    console.log("definitions GOTTEN!");
    return;
};
async function saveSocketDefinitions(session_id, api_key, data) {
    let def_keys = Object.keys(data);
    let entry, string_key;
    for(let i =0; i < def_keys.length; i++)
    {
        entry = data[def_keys[i]];
        string_key = def_keys[i].toString();
        if(!(string_key in socket_definitions))
        {
            socket_definitions[string_key] = entry;
        }
    }
    console.log("definitions GOTTEN!");
    return;
};

function parseGunData(item_data) {
    if(!(item_data) || !("hash" in item_data)){ return; } // can't be saved ATM without a hash
    itemHash = item_data["hash"];
    itemName = false;
    itemIcon = false;
    itemDesc = false;
    itemType = false;
    itemTypeDesc = false;
    itemLore = false;
    itemScreenshot = false;
    try{
        itemName = item_data["displayProperties"]["name"];
        itemIcon = item_data["displayProperties"]["icon"];
        itemType = item_data["itemType"];
        itemTypeDesc = item_data["itemTypeDisplayName"];
        itemLore = item_data["loreHash"];
        itemScreenshot = item_data["screenshot"];

        itemDesc = item_data["displayProperties"]["description"];
        if(itemDesc != ""){
            itemDesc = item_data["displayProperties"]["description"];
        }
        else{   //then i think it's a gun
            itemDesc = item_data["flavorText"];
        }
    }
    catch{
        console.log("caught weapon reading error.");
    }
    return {"name":itemName,"icon":itemIcon,"description":itemDesc,"itemTypeDesc":itemTypeDesc,"itemType":itemType,"lore":itemLore,"screenshot":itemScreenshot};
};
function parseSocketData(item_data){
    itemHash = false;
    //itemType = false;
    itemSubType = false;
    itemName = false;
    itemDesc = false;
    itemIcon = false;
    itemTypeDesc = false;
    itemCategories = false;

    itemHash = item_data["hash"];
    // itemType is always 19
    /*
    itemType = item_data["itemType"];
    if(!(itemType in socket_directory))
    {
        socket_directory[itemType] = {};
    }*/
    if("itemSubType" in item_data){ itemSubType = item_data["itemSubType"]; }
    if("displayProperties" in item_data){
        itemName = item_data["displayProperties"]["name"];
        itemDesc = item_data["displayProperties"]["description"];
        if(item_data["displayProperties"]["hasIcon"]){ itemIcon = item_data["displayProperties"]["icon"]; }
    }
    if("itemTypeDisplayName" in item_data){ itemTypeDesc = item_data["itemTypeDisplayName"]; }
    if("itemCategoryHashes" in item_data){ itemCategories = item_data["itemCategoryHashes"]; }

    return {"name":itemName,"description":itemDesc,"icon":itemIcon,"itemTypeDesc":itemTypeDesc,"subType":itemSubType,"itemCategoryHashes":itemCategories};
};

async function saveResults(session_id=-1, api_key, data) {
    item_data = data.Response;
    gun_data = parseGunData(item_data);

    weapon_directory[itemHash] = gun_data;
    printSockets(session_id, api_key,item_data);
}
async function printResults(session_id=-1, api_key, data) {
    item_data = data.Response;
    if(!item_data){ console.log("Undefined item_data."); return; }

    saveResults(session_id, api_key, data);
    writeToFile("test_output", item_data);
};
async function printSockets(session_id=-1, api_key, item_data) {
    let type_hash;
    let instance_hash;
    let plug_hash;
    if("sockets" in item_data){
        let socket_array = item_data["sockets"]["socketEntries"];
        for(let i = 0; i < socket_array.length; i++){

            type_hash = socket_array[i]["socketTypeHash"];
            instance_hash = socket_array[i]["singleInitialItemHash"];
            if("reusablePlugItems" in socket_array[i]){
                for(let j = 0; j < socket_array[i]["reusablePlugItems"].length; j++){
                    plug_hash = socket_array[i]["reusablePlugItems"][j]["plugItemHash"];

                    if(!(plug_hash in socket_to_weapon)){ socket_to_weapon[plug_hash] = []; }
                    if(!(socket_to_weapon[plug_hash].includes(item_data["hash"])))
                    { socket_to_weapon[plug_hash].push(item_data["hash"]); }
                    if(!(item_data["hash"] in weapon_to_socket)){ weapon_to_socket[item_data["hash"]] = []; }
                    if(!(weapon_to_socket[item_data["hash"]].includes(plug_hash)))
                    { weapon_to_socket[item_data["hash"]].push(plug_hash); }
                    
                    r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + plug_hash + "/";
                    await create(session_id,url=r_url,api_key=api_key, {
                        //"components":"300"
                    },
                        saveSocket, "GET"
                    );
                }

            }
        }
    }
};
async function saveSocket(session_id=-1, api_key, data) {
    item_data = data.Response;
    if(!item_data){ 
        //console.log("Undefined item_data."); 
        return; 
    }
    
    socket_data = parseSocketData(item_data);
    socket_directory[itemHash] = socket_data;
    await unpackSocket(categorised_sockets, itemHash, item_data);
    return;
}
async function getItemDetail(session_id, api_key, data) {
    player = player_directory[session_id];
    inventory_data = data.Response["characterInventories"]["data"];
    titan_inventory = inventory_data[player.chara_ids[0]]["items"];

    console.log(`\n\n---itemHash: ${titan_inventory[0]["itemHash"]}---\n\n`);

    //r_url = "https://www.bungie.net/platform/Destiny2/" + player["membershipType"] + "/Profile/" + player["membershipId"] + "/Item/" + titan_inventory[0]["itemInstanceId"] + "/";
    r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + titan_inventory[0]["itemHash"] + "/";
    
    create(session_id,url=r_url,api_key=api_key, {},
        printResults, "GET"
    );
};

async function getWeaponHashes(session_id, api_key, data) {
    player = player_directory[session_id];
    open_inventory = [];

    let chara_id = 0;
    if( "characterInventories" in data.Response ) {     // components 201
        inventory_data = data.Response["characterInventories"]["data"];
        open_inventory = inventory_data[player.chara_ids[0]]["items"];
        chara_id = String(player.chara_ids[0]);
    }
    else if( "characterEquipment" in data.Response ) {  // components 205
        inventory_data = data.Response["characterEquipment"]["data"];
        open_inventory = inventory_data[player.chara_ids[0]]["items"];
        chara_id = String(player.chara_ids[0]);
    }
    else if( "profileInventory" in data.Response ) {    // components 102
        inventory_data = data.Response["profileInventory"]["data"];
        open_inventory = inventory_data["items"];
        chara_id = "100";   //for vault
    }

    player_directory[session_id][chara_id] = {};
    for(let i = 0; i < open_inventory.length; i++)
    {
        let key = open_inventory[i]["itemHash"];
        let string_key = key.toString();
        if(!(string_key in weapon_directory))
        {
            //weapon_directory[string_key] = false;
            player_directory[session_id][chara_id][string_key] = false;
        }
    }
    writeToFile("weapon_directory", weapon_directory);
    return;
};
async function getItems(session_id, api_key, data) {
    player = player_directory[session_id];
    ids = Object.keys(data.Response["characters"].data);
    player.chara_ids = [];
    player.chara_metadata = [];
    for(i = 0; i < 3; i++)
    {
        player.chara_ids[i] = ids[i];
        player.chara_metadata = data.Response["characters"].data[ids[i]];
    }
    
    r_url = "https://www.bungie.net/platform/Destiny2/" + player["membershipType"] + "/Profile/" + player["membershipId"];
    create(session_id,url=r_url,api_key=api_key, {
        "components":"102"
    },
        getWeaponHashes, "GET" //getItemDetail, "GET"
    );
};
async function getCharacters(session_id, api_key, data) {
    player = player_directory[session_id];
    player["membershipType"] = data.Response[0]["membershipType"];
    player["membershipId"] = data.Response[0]["membershipId"];
    r_url = "https://www.bungie.net/platform/Destiny2/" + data.Response[0]["membershipType"] + "/Profile/" + data.Response[0]["membershipId"];
    create(session_id=session_id, url=r_url,api_key=api_key, {
        "components":"Characters"
    },
        getItems, "GET"
    );
};
async function create(session_id, url, api_key, body_params, next_function, method_type) {
    try {
        // Create the URL
        var r_url = url;

        // Create the headers
        const headers = {
            'Content-Type': 'application/json',
            "X-API-Key": api_key
        };

        // Create the POST body
        const body = JSON.stringify(body_params);

        // Send the POST request
        var response = null;
        if(method_type == "POST")
        {
            response = await fetch(r_url, { method: method_type, headers, body });
        }
        else    //method_type == "GET"
        {
            r_url = r_url + "?" + new URLSearchParams(body_params);
            console.log(r_url);
            response = await fetch(r_url, { method: method_type, headers });
        }

        // Check the response status
        if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Parse the JSON response
        const data = await response.json();
        console.log('Success:');//, data);
        //return data;
        if(next_function){ await next_function(session_id, api_key, data); }
    } catch (error) {
        // Handle any errors
        console.error('Error:', error);
    }
};

// pesky functions
function sendRequest(options){
    var agent = new http.Agent({});
    a_connect = agent.createConnection;
    
    var Request = makeRequest(options);
    Request.setHeader('content-type', 'application/json')
    Request.end();
    return;

    Request.responseType = 'json';
    Request.open("POST", url);
    Request.setRequestHeader('Content-Type', 'application/json');
    Request.setRequestHeader(header_json);

    Request.onreadystatechange = function(){
        if(Request.readyState == 4 && Request.status == 200){
            document.getElementById("").value += Request.response;
        }
    }
    Request.send(body_json);
};
function makeRequest(){
    Request = http.request()
    return Request;
};

// only trigger on the server's commandline
class destiny_commands {
    contructor(){}
    static destiny_show = function(target, id){
        console.log(`Show ${target} ${id}\n`);
        try {
            switch (target)
            {
                case "weapon":
                    console.log(`condition tests: ${id == true}, ${id == false}, ${id != null}, ${id.length}, ${id}.}`);
                    console.log("final test: ", (id && id.length == 0));
                    if(id && id.length != 0){
                        console.log(weapon_directory[id]); 
                    } else{ console.log("categorised guns:"); console.log(categorised_guns); }
                    break;
                case "character":
                    console.log(player_directory[id]); break;
                case "socket":
                    if(id && id.length != 0){
                        console.log(socket_directory[id]); 
                    } else{ console.log("categorised sockets:"); console.log(Object.keys(categorised_sockets)); }
                    break;
            }
        }
        catch{ console.log(`Doesn't contain id ${id}.`); }
        return;
    }
    static destiny_manifest = async function(type, id){
        console.log(`Manifest ${type} ${id}`);
        let r_url = "";
        try{
            switch (type)
            {
                case "weapon":
                    console.log("id ", id, " equals:", (id == "all"));
                    switch(id[0]) {
                        case "all":
                            console.log("in all");
                            let weapon_keys = Object.keys(weapon_directory);
                            for(let i in weapon_keys){
                                let key = weapon_keys[i];
                                if(weapon_directory[key] == false){
                                    //r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + key + "/";
                                    r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + key + "/";
                                    await create(-1,r_url,API_KEY, {
                                        //"components":"300"
                                    },
                                        saveResults, "GET"
                                    );
                                }
                            }
                            break;
                        case "definitions":
                            console.log("in definitions");
                            let r_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinyInventoryItemDefinition-c72a34d3-f297-4f5f-8da6-8767b662554d.json";
                            await create(-1,r_url,API_KEY, {},
                                saveWeaponDefinitions, "GET"
                            );
                            break;
                        default:
                            console.log("in specific");
                            r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + id + "/";
                            create(-1,r_url,API_KEY, {
                                //"components":"300"
                            },
                                printResults, "GET"
                            );
                            break;
                    } 
                    break;
                case "socket":
                    switch(id[0]) {
                        case "all":
                            break;
                        case "definitions":
                            console.log("in definitions");
                            let r_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinySandboxPerkDefinition-c72a34d3-f297-4f5f-8da6-8767b662554d.json";
                            await create(-1,r_url,API_KEY, {},
                                saveSandboxDefinitions, "GET"
                            );
                            break;
                    }
                    break;
                case "lore":
                    console.log("Manifest lore?");
                    r_url = "https://www.bungie.net/" + "/common/destiny2_content/json/en/DestinyLoreDefinition-c72a34d3-f297-4f5f-8da6-8767b662554d.json";
                    await create(-1,r_url,API_KEY, {
                        //"components":"300"
                    },
                        saveLoreDefinitions, "GET"
                    );
                    break;
                case "plugset":
                    console.log("Manifest plugset?");
                    r_url = "https://www.bungie.net/" + "/common/destiny2_content/json/en/DestinyPlugSetDefinition-c72a34d3-f297-4f5f-8da6-8767b662554d.json";
                    await create(-1,r_url,API_KEY, {
                        //"components":"300"
                    },
                        savePlugsetDefinitions, "GET"
                    );
                    break;
                case "sockettype":
                    console.log("Manifest socket types?");
                    r_url = "https://www.bungie.net/" + "/common/destiny2_content/json/en/DestinySocketTypeDefinition-c72a34d3-f297-4f5f-8da6-8767b662554d.json";
                    await create(-1,r_url,API_KEY, {
                        //"components":"300"
                    },
                        saveSockettypeDefinitions, "GET"
                    );
                    break;
                default:
                    console.log("Manifest default?");
                    r_url = "https://www.bungie.net/platform/Destiny2/Manifest/";
                    await create(-1,r_url,API_KEY, {
                        //"components":"300"
                    },
                        printResults, "GET"
                    );
                    break;
            }
        }
        catch(err){ console.log(err); }
        return;
    };
    static destiny_read = function(type, id){
        console.log(`Read ${type} ${id}`);
        let r_url = "";
        try{
            switch (type)
            {
                case "weapon":
                    console.log("id ", id, " equals:", (id == "all"));
                    switch(id[0]) {
                        case "all":
                            console.log("in all");
                            let weapon_keys = Object.keys(weapon_directory);
                            let key; let socket; let plug_hash;
                            for(let i in weapon_keys){
                                key = weapon_keys[i];
                                for(let j = 0; j < item_definitions[key]["sockets"]["socketEntries"].length; j++)
                                {
                                    socket = item_definitions[key]["sockets"]["socketEntries"][j];
                                    if("reusablePlugItems" in socket){
                                        for(let k = 0; k < socket["reusablePlugItems"].length; k++){
                                            //console.log(`plug #${j}.`);
                                            plug_hash = socket["reusablePlugItems"][k]["plugItemHash"];
                                            r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + plug_hash + "/";
                                            create(-1,r_url,API_KEY, {
                                                //"components":"300"
                                            },
                                                saveSocket, "GET"
                                            );
                                        }
                                    }
                                }
                                if(weapon_directory[key] == false){
                                    //r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + key + "/";
                                    r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + key + "/";
                                    create(-1,r_url,API_KEY, {
                                        //"components":"300"
                                    },
                                        saveResults, "GET"
                                    );
                                }
                            }
                            break;
                        default:
                            //console.log(item_definitions[id]); 
                            console.log(item_definitions[id]["sockets"]["socketEntries"][0]);
                            
                            break;
                    }
                    break;
            }
        }
        catch(err){ console.log(err); }
        return;
    };
    static destiny_save = function(type, id){
        console.log(`Save ${type} ${id}`);
        try{
            switch(type)
            {
                case "weapon":
                    writeToFile("weapon_directory", weapon_directory);
                    //writeToFile("DestinyInventoryItemDefinition", item_definitions); 
                    break;
                case "lore":
                    writeToFile("lore_directory", lore_directory); break;
                case "socket":
                    //writeToFile("socket_directory", socket_directory);
                    writeToFile("socket_to_weapon", socket_to_weapon);
                    writeToFile("weapon_to_socket", weapon_to_socket);
                    //writeToFile("DestinySandboxPerkDefinition", socket_definitions);
                    break;
                case "all":
                    console.log("inside of save all switchcase");
                    writeToFile("lore_directory", lore_directory);
                    writeToFile("DestinySandboxPerkDefinition", perk_definitions);
                    writeToFile("DestinyInventoryItemDefinition", item_definitions); 
                    writeToFile("DestinySocketTypeDefinition", sockettype_definitions); 
                    writeToFile("DestinyPlugSetDefinition", plugset_definitions);

                    writeToFile("weapon_directory", weapon_directory);
                    writeToFile("socket_to_weapon", socket_to_weapon);
                    writeToFile("weapon_to_socket", weapon_to_socket);
                    console.log("hopefully all those files were written");
            }
        }
        catch(err){ console.log(err); }
        return;
    };
};

// temporary. until i make an endpoint for myself to send commands
async function genericSaveDefinitions(session_id, api_key, data, the_dict) {
    let def_keys = Object.keys(data);
    let entry, string_key;
    for(let i =0; i < def_keys.length; i++)
    {
        entry = data[def_keys[i]];
        string_key = def_keys[i].toString();
        if(!(string_key in the_dict))
        {
            the_dict[string_key] = entry;
        }
    }
    return;
}
async function saveSandboxDefinitions(session_id, api_key, data) {
    await genericSaveDefinitions(session_id, api_key, data, perk_definitions);
    console.log("saved perk definitions");
}
async function saveLoreDefinitions(session_id, api_key, data) {
    await genericSaveDefinitions(session_id, api_key, data, lore_directory);
    console.log("saved lore definitions");
}
async function savePlugsetDefinitions(session_id, api_key, data) {
    await genericSaveDefinitions(session_id, api_key, data, plugset_definitions);
}
async function saveSockettypeDefinitions(session_id, api_key, data) {
    await genericSaveDefinitions(session_id, api_key, data, sockettype_definitions);
}

async function save_data_command(){
    await destiny_commands.destiny_save("all","");
    console.log("saved all (command)");
}
setTimeout(save_data_command,600000);   //10 minutes

console.log(router);
module.exports = {"router":router, "destiny_commands":destiny_commands};
