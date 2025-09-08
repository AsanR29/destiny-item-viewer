const fs = require('node:fs');
const path = require('node:path');

const DestinyPlayer = require("./destiny_player");

// plug categories which denote that its a perk
const valid_category_hashes = [1744546145,2833605196,1806783418,7906839,164955586,3809303875,1257608559,2619833294,1757026848,577918720,1202604782,2718120384,3962145884,1041766312,683359327,1697972157];
// this is intrinsics, barrels, magazines, frames, origins, bowstrings, arrows, scopes, batteries, stocks, tubes, magazines_gl, grips, blades, guards, hafts

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
        try { load_result = await this.loadFromFile("DestinyLoreDefinition", this.lore_directory); }
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
        
    };
    static async loadFromFile(file_name, target_dict) {
        let val = false;
        let data = fs.readFileSync(this.render_filepath+"static_data/"+file_name+".json", "utf8");
        // file written successfully
        val = data;

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
                if(target_dict == this.weapon_directory){ 
                    let gun = destiny_weapon.clone(input[j_keys[i]]);
                    target_dict[j_keys[i]] = gun;
                    await this.shelfWeapon(this.categorised_guns, j_keys[i], gun); 
                }
                else{
                    target_dict[j_keys[i]] = input[j_keys[i]];
                }
                if(target_dict == this.socket_directory){ await this.unpackSocket(this.categorised_sockets, j_keys[i], input[j_keys[i]])}
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
        //if(gun == false){ gun = this.parseGunData(this.item_definitions[hash]); }
        if(gun == false || !("itemTypeDesc" in gun)){ return; }
        if(!(gun["itemTypeDesc"] in target_dict)){ target_dict[gun["itemTypeDesc"]] = []; }
        if(!(target_dict[gun["itemTypeDesc"]].includes(hash))) {
            target_dict[gun["itemTypeDesc"]].push(hash); 
        }
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
            if(entry["itemType"] != 3){ continue; }
            string_key = def_keys[i].toString();

            if(!(string_key in this.weapon_directory) || this.weapon_directory[string_key] == false) {
                this.weapon_directory[string_key] = new destiny_weapon(string_key); //this.parseGunData(entry);
            }
            //let gun = this.weapon_directory[string_key];
        }
        return;
    };
    static async getWeaponHashes(session_id, data) {
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
        
        player[chara_id] = {};
        let entry;
        for(let i = 0; i < open_inventory.length; i++)
        {
            let key = open_inventory[i]["itemHash"];
            let string_key = key.toString();
            if(!(string_key in this.weapon_directory)){ this.weapon_directory[string_key] = false; }

            entry = false;
            if("itemInstanceId" in open_inventory[i]) { 
                //entry = open_inventory[i]["itemInstanceId"]; 
                entry = new destiny_weapon(string_key,open_inventory[i]["itemInstanceId"]);
            }
            player[chara_id][entry.hash_unique] = entry;
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
            if(!(key in this.weapon_directory) || this.weapon_directory[key] == false){ this.weapon_directory[key] = new destiny_weapon(key); }
            let gun = this.weapon_directory[key];
            
            switch(gun.stage) {
                case 1:
                    gun.parseGunData(); break;
                case 2:
                    gun.parseGunSockets();  break;
            }
        }
        return;
    }
    //parse-data functions
    
    static parseGunData(item_data) {
        if(!(item_data) || !("hash" in item_data)){ return; } // can't be saved ATM without a hash

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
        let smallIcon = false;
        let itemTypeDesc = false;
        //let itemCategories = false;
        let itemCategory = false;

        itemHash = item_data["hash"];
        // itemType is always 19

        if("itemSubType" in item_data){ itemSubType = item_data["itemSubType"]; }
        if("displayProperties" in item_data){
            itemName = item_data["displayProperties"]["name"];
            itemDesc = item_data["displayProperties"]["description"];
            if(item_data["displayProperties"]["hasIcon"]){ itemIcon = item_data["displayProperties"]["icon"]; }
            if("iconSequences" in item_data["displayProperties"] && item_data["displayProperties"]["iconSequences"].length > 1) {
                smallIcon = item_data["displayProperties"]["iconSequences"][1]["frames"][0];   //the 2nd one is smaller
            }
        }
        if("itemTypeDisplayName" in item_data){ itemTypeDesc = item_data["itemTypeDisplayName"]; }
        // plug
        if("plug" in item_data) { 
            if(valid_category_hashes.includes(item_data["plug"]["plugCategoryHash"])) {
                itemCategory = item_data["plug"]["plugCategoryIdentifier"];  }
        }
        return {"name":itemName,"description":itemDesc,"icon":itemIcon,"small_icon":smallIcon,"itemTypeDesc":itemTypeDesc,"subType":itemSubType,"itemCategory":itemCategory,"hash":itemHash};
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

                        if(!(plug_hash in this.socket_to_weapon)){ this.socket_to_weapon[plug_hash] = new Set(); }
                        this.socket_to_weapon[plug_hash].add(item_data["hash"]);    // repeats don't get added to sets anyway

                        if(!(item_data["hash"] in this.weapon_to_socket)){ this.weapon_to_socket[item_data["hash"]] = new Set(); }
                        this.weapon_to_socket[item_data["hash"]].add(plug_hash);
                        
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
    }
    static async saveSocket(data) {
        let item_data = data.Response;
        if(!item_data){ return; }
        
        let socket_data = parseSocketData(item_data);
        let itemHash = socket_data["hash"];
        this.socket_directory[itemHash] = socket_data;
        await unpackSocket(this.categorised_sockets, itemHash, item_data);
        return;
    }

    static getSocket(socket_hash) {
        if(socket_hash in this.socket_directory){ return this.socket_directory[socket_hash]; }
        // else
        let socket = this.item_definitions[socket_hash];
        if(socket){
            let perk = this.parseSocketData(socket);
            destiny_data.socket_directory[socket_hash] = perk;
            return perk;
        }
        else{ return false; }
    }
}

class destiny_weapon {
    static UNIQUE_ID = 1;
    constructor(item_hash,instance_hash=false) {
        //stage 1
        if(item_hash == false){ return; }   //to get the object without incrementing UNIQUE_ID
        this.hash_unique = destiny_weapon.UNIQUE_ID; ++destiny_weapon.UNIQUE_ID;
        this.stage = 1;
        this.item_hash = item_hash;
        this.instance_hash = instance_hash;
    }
    //used to load from file
    static clone(old_gun){
        var new_gun = new destiny_weapon(false);
        let attributes = Object.keys(other_object);
        for(key in attributes){
            new_gun[key] = old_gun[key];
        }
        if(new_gun.hash_unique > destiny_weapon.UNIQUE_ID){ ++destiny_weapon.UNIQUE_ID; }
    }
    //increases stage to 2
    parseGunData() {
        if(!(this.item_hash)){ return; } // can't be saved ATM without a hash
        let item_data = destiny_data.item_definitions[this.item_hash];

        this.name = false;
        this.icon = false;
        this.small_icon = false;
        this.description = false;
        this.itemType = false;
        this.itemTypeDesc = false;
        this.lore = false;
        this.screenshot = false;
        try{
            this.name = item_data["displayProperties"]["name"];
            this.icon = item_data["displayProperties"]["icon"];
            if("iconSequences" in item_data["displayProperties"] && item_data["displayProperties"]["iconSequences"].length > 1) {
                try{ this.small_icon = item_data["displayProperties"]["iconSequences"][1]["frames"][0]; }  //the 2nd one is smaller
                catch{ this.small_icon = false; }
            }
            this.itemType = item_data["itemType"];
            this.itemTypeDesc = item_data["itemTypeDisplayName"];
            this.lore = item_data["loreHash"];
            this.screenshot = item_data["screenshot"];

            this.description = item_data["displayProperties"]["description"];
            if(this.description == ""){
                this.description = item_data["flavorText"];
            }
            if(this.stage == 1){ this.stage = 2; }  // stage = 2

            destiny_data.shelfWeapon(destiny_data.categorised_guns, this.item_hash, this); // adds it to categorised weapons
            return true;
        }
        catch (err){
            console.log(`caught weapon reading error. ${err}`);
        }
        return false;
    }
    //increase stage to 3
    parseGunSockets() {
        this.perk_pool = {};
        let perk_pool;
        let sock;
        let perk_hash, perk; let itemCategory;
        
        if(!(this.item_hash in destiny_data.weapon_to_socket)) {
            let all_sockets = destiny_data.item_definitions[this.item_hash];
            if( !("sockets" in all_sockets && "socketEntries" in all_sockets["sockets"])){ return false; }
            all_sockets = all_sockets["sockets"]["socketEntries"];

            destiny_data.weapon_to_socket[this.item_hash] = new Set();
            perk_pool = destiny_data.weapon_to_socket[this.item_hash];
            let plug_hash, perk_array;
            let frame_two = false;
            for(let i = 0; i < all_sockets.length; i++) {
                let definition = destiny_data.sockettype_definitions[all_sockets[i].socketTypeHash];
                if(!definition){ continue; }
                let category_hash = definition.plugWhitelist[0].categoryHash;
                itemCategory = definition.plugWhitelist[0].categoryIdentifier;
                if(!(valid_category_hashes.includes(category_hash))){ 
                    continue;
                }

                if("randomizedPlugSetHash" in all_sockets[i]) {
                    plug_hash = all_sockets[i]["randomizedPlugSetHash"];
                }
                else if("reusablePlugSetHash" in all_sockets[i]) {
                    plug_hash = all_sockets[i]["reusablePlugSetHash"];
                }
                else{ continue; }
                perk_array = destiny_data.plugset_definitions[plug_hash]["reusablePlugItems"];
                
                if(itemCategory == 'frames') { if(frame_two){ itemCategory = 'frames_2'; } else { itemCategory = 'frames_1'; frame_two=true; } }

                perk_pool[itemCategory] = new Set();
                for(let j = 0; j < perk_array.length; j++) {
                    perk_hash = perk_array[j]["plugItemHash"];
                    if(perk_pool[itemCategory].has(perk_hash)) {
                        continue;
                    }   // else
                    perk_pool[itemCategory].add(perk_hash);
                }

                destiny_data.weapon_to_socket[this.item_hash] = perk_pool;
            }
        }
        perk_pool = destiny_data.weapon_to_socket[this.item_hash];
        let categoryArray = Object.keys(perk_pool);
        let sock_set;
        for(let i = 0; i < categoryArray.length; i++){
            itemCategory = categoryArray[i];
            sock_set = perk_pool[itemCategory];
            //
            console.log(sock_set);
            console.log(typeof sock_set, destiny_data.weapon_directory.size);
            for(let entry of sock_set.entries()) {
                let perk_hash = entry[0];
                sock = destiny_data.getSocket(perk_hash);
                if(sock.itemTypeDesc == 'Enhanced Trait'){ return; }
                if(!(itemCategory in this.perk_pool)){ this.perk_pool[itemCategory] = []; }
                this.perk_pool[itemCategory].push(perk_hash);
            }

            
        }
        if(this.stage == 2){ this.stage = 3 }  // stage = 3
        return true;
    };
    //increase stage to 4
    parseGunUnique(perk_array) {
        this.perk_pool = {};

        let perk_hash;
        let perk; let sock; let damageType;

        let frame_two = false; let itemCategory;
        for(let i = 0; i < perk_array.length; i++) {
            perk_hash = perk_array[i]["plugHash"];
            sock = destiny_data.item_definitions[perk_hash];
            if(!sock){ continue; }
            if("damageTypeHash" in sock) {
                damageType = destiny_data.damagetype_definitions[sock["damageTypeHash"]];
                sock = damageType;
            }
            if (sock["isDisplayable"] == false){
                continue;
            }
            perk = destiny_data.parseSocketData(sock);
            if(perk.itemCategory){
                itemCategory = perk.itemCategory;
                if(itemCategory == 'frames') { if(frame_two){ itemCategory = 'frames_2'; } else { itemCategory = 'frames_1'; frame_two=true; } }
                if(!(itemCategory in this.perk_pool)){ this.perk_pool[itemCategory] = []; }
                this.perk_pool[itemCategory].push(perk.hash);
            }
        }
        this.stage = 4; //stage = 4
    };

    // For later
    compareUniqueGuns(hash_unique) { return false; }
    //Compare 2 guns, rate the comparison
    compareGuns(item_hash) {
        let rating = 0;
        let perk_keys = Object.keys(this.perk_pool);
        let opp_set = destiny_data.weapon_to_socket[item_hash];
        if(!opp_set) {
            let gun = destiny_data.weapon_directory[item_hash];
            switch(gun.stage) {
                case 1:
                    gun.parseGunData();
                case 2:
                    gun.parseGunSockets();
            }
            opp_set = destiny_data.weapon_to_socket[item_hash];
            if(!opp_set){ return false; }
        }
 
        for(let i in perk_keys) {
            let key = perk_keys[i];
            let perk_set = new Set();
            for(let j in this.perk_pool[key]) {
                let perk = this.perk_pool[key][j];
                perk_set.add(perk);
            }

            if(!(key in opp_set) || key==0){ continue; }
            rating += ( custom_intersection(perk_set,opp_set[key]).size / perk_set.size);
        }
        rating /= perk_keys.length; // a fraction of 1, ideally
        return rating;
    }
    //Find similiar guns
    similiarGunSets() {
        let itemTypeDesc = destiny_data.weapon_directory[this.item_hash].itemTypeDesc;
        let super_set = new Set(destiny_data.categorised_guns[itemTypeDesc]);
        let rating_dict = {};
        
        console.log(super_set);
        console.log(typeof super_set);        
        for(let entry of super_set.entries()) {
            let item_hash = entry[0];
            let rating = this.compareGuns(item_hash);
            if(rating){
                rating_dict[rating] = item_hash;
            }
        }
        return rating_dict;
    }
}

function custom_intersection(set_one, set_two) {
    let set_three = new Set();
    for(let entry of set_one.entries()) {
        let val = entry[0];
        
        if(set_two.has(val)){ set_three.add(val); }
    }
    return set_three;
}

let folder_path = path.resolve(destiny_data.render_filepath, "static_data");
if (!fs.existsSync(folder_path)) {
    fs.mkdirSync(folder_path, true); // recursive = true
}
//destiny_data.loadAllFiles();

module.exports = destiny_data;