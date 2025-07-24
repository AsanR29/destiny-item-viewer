var express = require('express');
const mongoose = require('mongoose');
var router = express.Router();

var http = require('http');
const { URLSearchParams } = require('url');
const fs = require('node:fs');
const path = require('node:path');

const DD = require("../scripts/destiny_data");

//routes
router.get('/',  function(req, res, next) {
    res.render('destiny/destiny_homepage', { title: "Destiny Two", unique_users: 3 } );
});

router.get('/login', function(req, res, next) {
    res.render('destiny/destiny_login', { title: "Bungie Account Details" } );
});
router.get('/loginguest', function(req, res, next) {
    let guest_form = {  // My account.
        "displayName": "Nasa2907",
        "displayNameCode": "1043"
    };
    loginUser(req.sessionID, guest_form).then(res.redirect('/vault'));
});
async function loginUser(session_id, form) {
    console.log(" LOG IN USER ");
    const base_auth_url = "https://www.bungie.net/en/OAuth/Authorize";
    const token_url = "https://www.bungie.net/platform/app/oauth/token/";

    //dictionary to hold extra headers
    const HEADERS = {"X-API-Key":DD.API_KEY};
    membershipType = "All";

    url = 'https://www.bungie.net/platform/Destiny2/SearchDestinyPlayerByBungieName/' + membershipType + '/';
    User = {"displayName":form.displayName, "displayNameCode":form.displayNameCode};
    console.log("session_id ",session_id);
    DD.player_directory[session_id] = {
        "displayName": form.displayName,
        "displayNameCode": form.displayNameCode
    };
    console.log("passed?");
    await create(session_id, url=url,api_key=DD.API_KEY, {
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
    let filter = req.params.filter;
    let inventory_data = {};

    let player = DD.player_directory[req.sessionID];
    if(player && ("100" in player)){
        let vault = player["100"];
        let vault_keys = Object.keys(vault);
        let item_data = {};
        let gun = {};
        for(let i = 0; i < vault_keys.length; i++){
            item_data = DD.item_definitions[vault_keys[i]];
            //console.log(item_data);
            gun = DD.parseGunData(item_data);
            inventory_data[vault_keys[i]] = gun;
        }
    }
    //if(!filter){ filter = false; }
    filter = false;
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
    let item_data = DD.item_definitions[req.params.gun_id];
    let gun = DD.parseGunData(item_data);
    let text = false;
    let desc = false;
    console.log("lore: ", gun, gun["lore"]);
    if(gun["lore"] && DD.lore_directory[gun["lore"]]){
        text = DD.lore_directory[gun["lore"]];
        desc = text["displayProperties"]["description"];
        text["displayProperties"]["description"] = desc;
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
                perk = DD.perk_definitions[perk_hash];
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
router.get('/ref', function(req, res, next) {
    res.render('destiny/destiny_ref_page', { title: "Your Account"} );
});

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
async function saveManifest(session_id=-1, api_key, data) {
    item_data = data.Response;
    if(!item_data){ console.log("Undefined item_data."); return; }
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
    console.log("in getWeaponHashes");
    player = DD.player_directory[session_id];
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
    console.log(`chara_id is ${chara_id}`);
    DD.player_directory[session_id][chara_id] = {};
    for(let i = 0; i < open_inventory.length; i++)
    {
        let key = open_inventory[i]["itemHash"];
        let string_key = key.toString();
        if(!(string_key in DD.weapon_directory))
        {
            DD.weapon_directory[string_key] = false;
            DD.player_directory[session_id][chara_id][string_key] = false;
        }
    }
    //writeToFile("weapon_directory", DD.weapon_directory);
    return;
};
async function getItems(session_id, api_key, data) {
    console.log("in getItems");
    player = DD.player_directory[session_id];
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
    player = DD.player_directory[session_id];
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
        throw new Error(`HTTP error! Status: ${response.status}. url: ${r_url}`);
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
                            console.log("in weapon all");
                            let weapon_keys = Object.keys(weapon_directory);
                            for(let i in weapon_keys){
                                let key = weapon_keys[i];
                                if(weapon_directory[key] == false){
                                    //r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + key + "/";
                                    r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + key + "/";
                                    await create(-1,r_url,DD.API_KEY, {
                                        //"components":"300"
                                    },
                                        saveResults, "GET"
                                    );
                                }
                            }
                            break;
                        case "definitions":
                            console.log("in definitions");
                            r_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinyInventoryItemDefinition-4d61d37e-f133-44a3-a88c-2a0500303318.json";
                            await create(-1,r_url,DD.API_KEY, {},
                                saveWeaponDefinitions, "GET"
                            );
                            break;
                        default:
                            console.log("in specific");
                            r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + id + "/";
                            create(-1,r_url,DD.API_KEY, {
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
                            r_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinySandboxPerkDefinition-4d61d37e-f133-44a3-a88c-2a0500303318.json";
                            await create(-1,r_url,DD.API_KEY, {},
                                saveSandboxDefinitions, "GET"
                            );
                            break;
                    }
                    break;
                case "lore":
                    console.log("Manifest lore?");
                    r_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinyLoreDefinition-4d61d37e-f133-44a3-a88c-2a0500303318.json";
                    await create(-1,r_url,DD.API_KEY, {
                        //"components":"300"
                    },
                        saveLoreDefinitions, "GET"
                    );
                    break;
                case "plugset":
                    console.log("Manifest plugset?");
                    r_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinyPlugSetDefinition-4d61d37e-f133-44a3-a88c-2a0500303318.json";
                    await create(-1,r_url,DD.API_KEY, {
                        //"components":"300"
                    },
                        savePlugsetDefinitions, "GET"
                    );
                    break;
                case "sockettype":
                    console.log("Manifest socket types?");
                    r_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinySocketTypeDefinition-4d61d37e-f133-44a3-a88c-2a0500303318.json";
                    await create(-1,r_url,DD.API_KEY, {
                        //"components":"300"
                    },
                        saveSockettypeDefinitions, "GET"
                    );
                    break;
                default:
                    console.log("Manifest default?");
                    r_url = "https://www.bungie.net/platform/Destiny2/Manifest/";
                    await create(-1,r_url,DD.API_KEY, {
                        //"components":"300"
                    },
                        saveManifest, "GET"
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
                                            create(-1,r_url,DD.API_KEY, {
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
                                    create(-1,r_url,DD.API_KEY, {
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
                case "everything":
                    console.log("inside of save all switchcase");
                    writeToFile("lore_directory", lore_directory);
                    writeToFile("DestinySandboxPerkDefinition", perk_definitions);
                    writeToFile("DestinyInventoryItemDefinition", item_definitions); 
                    writeToFile("DestinySocketTypeDefinition", sockettype_definitions); 
                    writeToFile("DestinyPlugSetDefinition", plugset_definitions);

                    writeToFile("weapon_directory", weapon_directory);
                    writeToFile("socket_directory", socket_directory);
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
    //console.log(data);
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
    await destiny_commands.destiny_save("everything","");
    console.log("saved all (command)");
}
//setTimeout(save_data_command,600000);   //10 minutes

module.exports = {"router":router, "destiny_commands":destiny_commands};
