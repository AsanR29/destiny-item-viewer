const fs = require('node:fs');
const path = require('node:path');

const DestinyPlayer = require("./destiny_player");
class destiny_data {
    static DISCORD_TOKEN = process.env.DISCORD_TOKEN;
    static CLIENT_ID = process.env.CLIENT_ID;
    static CLIENT_SECRET = process.env.CLIENT_SECRET;
    static API_KEY = process.env.API_KEY;
    static ENDPOINT_PASSWORD = process.env.ENDPOINT_PASSWORD;

    static render_filepath = process.env.DATA_PATH;

    static player_directory = {};
    static weapon_directory = {};
    static categorised_guns = {};
    static lore_directory = {};
    static socket_directory = {};
    static categorised_sockets = {};

    static socket_to_weapon = {};
    static weapon_to_socket = {};

    static item_definitions = {};
    static sockettype_definitions = {};
    static perk_definitions = {};
    static plugset_definitions = {};
    static damagetype_definitions = {};

    // MANIFEST ZONE
    //destiny_commands.destiny_manifest("","");
    // load saved weapon data
    static async loadAllFiles(){
        // load saved lore data
        let load_result = false;
        try { load_result = await this.loadFromFile("lore_directory", this.lore_directory); }
        catch { console.log("Error while loading lore_directory."); }
        // etc
        try { await this.loadFromFile("socket_to_weapon", this.socket_to_weapon); }
        catch { console.log("Error while loading socket_to_weapon."); }
        // etc
        try { await this.loadFromFile("weapon_to_socket", this.weapon_to_socket); }
        catch { console.log("Error while loading weapon_to_socket."); }
        // ALL item definitions...?
        load_result = false;
        try { load_result = await this.loadFromFile("DestinyInventoryItemDefinition", this.item_definitions); }
        catch { console.log("Error while loading DestinyInventoryItemDefinition."); }
        //console.log("item definitions length: ",this.item_definitions);
        // ALL socket type definitions
        load_result = false;
        try { load_result = await this.loadFromFile("DestinySocketTypeDefinition", this.sockettype_definitions); }
        catch{ console.log("Error while loading DestinySocketTypeDefinition."); }
        // ALL perk definitions...?
        load_result = false;
        try { load_result = await this.loadFromFile("DestinySandboxPerkDefinition", this.perk_definitions); }
        catch { console.log("Error while loading DestinySandboxPerkDefinition."); }
        // ALL plugset (randomised perk collection) definitions
        load_result = false;
        try { load_result = await this.loadFromFile("DestinyPlugSetDefinition", this.plugset_definitions); }
        catch { console.log("Error while loading DestinyPlugSetDefinition."); }
        load_result = false;
        try { load_result = await this.loadFromFile("DestinyDamageTypeDefinition", this.damagetype_definitions); }
        catch { console.log("Error while loading DestinyDamageTypeDefinition."); }
        // must go after item_definitions
        // load saved socket data
        try { await this.loadFromFile("socket_directory", this.socket_directory); }
        catch { console.log("Error while loading socket_directory."); }
        try{ await this.loadFromFile("weapon_directory", this.weapon_directory); }
        catch { console.log("Error while loading weapon_directory."); }
        
        if(process.env.DOWNLOAD == 1) {
            destiny_commands.destiny_manifest("lore",[""]);
            destiny_commands.destiny_manifest("weapon",["definitions"]);
            destiny_commands.destiny_manifest("sockettype",[""]);
            destiny_commands.destiny_manifest("socket",["definitions"]);
            destiny_commands.destiny_manifest("plugset",[""]);
            destiny_commands.destiny_manifest("damagetype",[""]);
        }
    };
    static async loadFromFile(file_name, target_dict) {
        let val = false;
        let data = fs.readFileSync(this.render_filepath+"static_data/"+file_name+".json", "utf8");
        // file written successfully
        val = data;
        console.log("success");

        let input = "";
        try{
            input = JSON.parse(val);
        } catch(err){ console.log(err); return false; }
        if(target_dict.length == 0)
        { target_dict = input; }
        else {
            let j_keys = Object.keys(input);
            console.log("j_keys length ",j_keys.length);
            for(let i = 0; i < j_keys.length; i++)
            {
                target_dict[j_keys[i]] = input[j_keys[i]];
                if(target_dict == this.weapon_directory){ await this.shelfWeapon(this.categorised_guns, j_keys[i], input[j_keys[i]]); }
                else if(target_dict == this.socket_directory){ await this.unpackSocket(this.categorised_sockets, j_keys[i], input[j_keys[i]])}
            }
        }
        return true;
    };

    static async writeToFile(file_name, data) {
        fs.writeFile(this.render_filepath+"static_data/"+file_name+".json", JSON.stringify(data), { flag: 'w+' }, err => {
        if (err) {
            console.error(err);
        } else {
            // file written successfully
            console.log("success");
        }
        });
    };

    static async shelfWeapon(target_dict, hash, gun) {
        if(gun == false){ gun = this.parseGunData(this.item_definitions[hash]); }
        if(!(gun["itemTypeDesc"] in target_dict)){ target_dict[gun["itemTypeDesc"]] = []; }
        target_dict[gun["itemTypeDesc"]].push(hash);
    };
    static async shelfSocket(target_dict, hash, socket) {
        if(!(socket in target_dict)){ target_dict[socket] = []; }
        target_dict[socket].push(hash);
    }
    static async unpackSocket(target_dict, hash, sockets) {
        let cats = sockets["itemCategoryHashes"];
        for(let i = 0; i < cats.length; i++){
            await shelfSocket(target_dict, hash, cats[i]);
        }
    }

    static async saveWeaponDefinitions(data) {
        console.log("Save Weapon Definitions.");
        let def_keys = Object.keys(data);
        let entry, string_key;
        for(let i = 0; i < def_keys.length; i++)
        {
            entry = data[def_keys[i]];
            string_key = def_keys[i].toString();
            if(!(string_key in this.item_definitions))
            {
                this.item_definitions[string_key] = entry;
            }
            if(!(string_key in this.weapon_directory) || this.weapon_directory[string_key] == false) {
                this.weapon_directory[string_key] = this.parseGunData(entry);
                let item_data = this.weapon_directory[string_key];

                if(entry["itemType"] == 3){
                    if("sockets" in entry){
                        let socket_array = entry["sockets"]["socketEntries"];
                        let plug_hash;
                        let perk_array;
                        for(let j = 0; j < socket_array.length; j++){
                            if("randomizedPlugSetHash" in socket_array[j]){
                                plug_hash = socket_array[j]["randomizedPlugSetHash"];

                                perk_array = this.plugset_definitions[plug_hash]["reusablePlugItems"];
                                if(!(string_key in this.weapon_to_socket)){ this.weapon_to_socket[string_key] = []; }
                                for(let k = 0; k < perk_array.length; k++){

                                    let perk_hash = perk_array[k]["plugItemHash"];
                                    if(!(this.weapon_to_socket[string_key].includes(perk_hash))){
                                        this.weapon_to_socket[string_key].push(perk_hash); 
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
    static async getWeaponHashes(session_id, data) {
        console.log("in getWeaponHashes");
        let player = this.player_directory[session_id];
        let open_inventory = [];

        let inventory_data;
        let chara_id = "vault";
        this.printResults(data);
        if( "characterInventories" in data.Response ) {     // components 201
            inventory_data = data.Response["characterInventories"]["data"];
            open_inventory = inventory_data[player.chara_ids[0]]["items"];
            chara_id = "inventory"; //String(player.chara_ids[0]);
        }
        else if( "characterEquipment" in data.Response ) {  // components 205
            inventory_data = data.Response["characterEquipment"]["data"];
            open_inventory = inventory_data[player.chara_ids[0]]["items"];
            chara_id = "equipment"; //String(player.chara_ids[0]);
        }
        else if( "profileInventory" in data.Response ) {    // components 102
            inventory_data = data.Response["profileInventory"]["data"];
            open_inventory = inventory_data["items"];
            chara_id = "vault";   //for vault
        }
        console.log(`chara_id is ${chara_id}`);
        player[chara_id] = {};
        let entry;
        for(let i = 0; i < open_inventory.length; i++)
        {
            let key = open_inventory[i]["itemHash"];
            let string_key = key.toString();
            if(!(string_key in this.weapon_directory)){ this.weapon_directory[string_key] = false; }

            entry = false;
            if("itemInstanceId" in open_inventory[i]) { entry = open_inventory[i]["itemInstanceId"]; }
            player[chara_id][string_key] = entry;
        }
        //this will finish executing on it's own time
        this.defineWeapons(open_inventory);
        //writeToFile("weapon_directory", this.weapon_directory);
        return;
    };
    static async defineWeapons(data) {
        //Don't await this function. use parseGunData for immediate results
        for(let i = 0; i < data.length; i++)
        {
            let key = data[i]["itemHash"];
            if(!(key in this.weapon_directory)){ this.weapon_directory[key] = false; }
            if(this.weapon_directory[key] == false) {
                let gun = this.item_definitions[key];
                this.weapon_directory[key] = this.parseGunData(gun);
            }
        }
        return;
    }
    //parse-data functions
    static parseGunData(item_data) {
        if(!(item_data) || !("hash" in item_data)){ return; } // can't be saved ATM without a hash
        console.log("parsing");
        let itemHash = item_data["hash"];
        let itemName = false;
        let itemIcon = false;
        let itemDesc = false;
        let itemType = false;
        let itemTypeDesc = false;
        let itemLore = false;
        let itemScreenshot = false;
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
        return {"name":itemName,"icon":itemIcon,"description":itemDesc,"itemTypeDesc":itemTypeDesc,"itemType":itemType,"lore":itemLore,"screenshot":itemScreenshot,"hash":itemHash};
    };
    static parseSocketData(item_data){
        let itemHash = false;
        //let itemType = false;
        let itemSubType = false;
        let itemName = false;
        let itemDesc = false;
        let itemIcon = false;
        let itemTypeDesc = false;
        let itemCategories = false;

        itemHash = item_data["hash"];
        // itemType is always 19

        if("itemSubType" in item_data){ itemSubType = item_data["itemSubType"]; }
        if("displayProperties" in item_data){
            itemName = item_data["displayProperties"]["name"];
            itemDesc = item_data["displayProperties"]["description"];
            if(item_data["displayProperties"]["hasIcon"]){ itemIcon = item_data["displayProperties"]["icon"]; }
        }
        if("itemTypeDisplayName" in item_data){ itemTypeDesc = item_data["itemTypeDisplayName"]; }
        if("itemCategoryHashes" in item_data){ itemCategories = item_data["itemCategoryHashes"]; }

        return {"name":itemName,"description":itemDesc,"icon":itemIcon,"itemTypeDesc":itemTypeDesc,"subType":itemSubType,"itemCategoryHashes":itemCategories,"hash":itemHash};
    };


    static async saveSocketDefinitions(data) {
        let def_keys = Object.keys(data);
        let entry, string_key;
        for(let i =0; i < def_keys.length; i++)
        {
            entry = data[def_keys[i]];
            string_key = def_keys[i].toString();
            if(!(string_key in this.socket_definitions))
            {
                this.socket_definitions[string_key] = entry;
            }
        }
        console.log("definitions GOTTEN!");
        return;
    };

    static async saveResults(data) {
        let item_data = data.Response;
        let gun_data = this.parseGunData(item_data);
        let itemHash = gun_data["hash"];

        this.weapon_directory[itemHash] = gun_data;
        //this.printSockets(item_data);
    }
    static async printResults(data) {
        let item_data = data.Response;
        if(!item_data){ console.log("Undefined item_data."); return; }

        //this.saveResults(data);
        await this.writeToFile("test_output", item_data);
    };
    static async printSockets(item_data) {
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

                        if(!(plug_hash in this.socket_to_weapon)){ this.socket_to_weapon[plug_hash] = []; }
                        if(!(this.socket_to_weapon[plug_hash].includes(item_data["hash"])))
                        { this.socket_to_weapon[plug_hash].push(item_data["hash"]); }
                        if(!(item_data["hash"] in this.weapon_to_socket)){ this.weapon_to_socket[item_data["hash"]] = []; }
                        if(!(this.weapon_to_socket[item_data["hash"]].includes(plug_hash)))
                        { this.weapon_to_socket[item_data["hash"]].push(plug_hash); }
                        
                        r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + plug_hash + "/";
                        await create(r_url, {
                            //"components":"300"
                        },
                            saveSocket, "GET"
                        );
                    }

                }
            }
        }
    };
    static async saveSocket(data) {
        let item_data = data.Response;
        if(!item_data){ 
            //console.log("Undefined item_data."); 
            return; 
        }
        
        let socket_data = parseSocketData(item_data);
        let itemHash = socket_data["hash"];
        this.socket_directory[itemHash] = socket_data;
        await unpackSocket(this.categorised_sockets, itemHash, item_data);
        return;
    }

    static async getItemDetail(data) {
        let player = player_directory[session_id];
        let inventory_data = data.Response["characterInventories"]["data"];
        let titan_inventory = inventory_data[player.chara_ids[0]]["items"];

        console.log(`\n\n---itemHash: ${titan_inventory[0]["itemHash"]}---\n\n`);

        let r_url = "https://www.bungie.net/platform/Destiny2/" + player["membershipType"] + "/Profile/" + player["membershipId"] + "/Item/" + titan_inventory[0]["itemInstanceId"] + "/";
        //let r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + titan_inventory[0]["itemHash"] + "/";
        
        /*create(session_id,url=r_url,api_key=api_key, {},
            printResults, "GET"
        );*/
    };
}

let folder_path = path.resolve(destiny_data.render_filepath, "static_data");
if (!fs.existsSync(folder_path)) {
    fs.mkdirSync(folder_path, true); // recursive = true
}
destiny_data.loadAllFiles();

module.exports = destiny_data;