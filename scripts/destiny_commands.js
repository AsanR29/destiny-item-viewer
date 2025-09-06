// only trigger on the server's commandline

const destiny_data = require("../scripts/destiny_data");
const DD = require("../scripts/destiny_data");
const DestinyRequest = require("../scripts/destiny_request");

async function save_data_command(){
    await destiny_commands.destiny_save("everything","");
    console.log("saved all (command)");
}
//setTimeout(save_data_command,600000);   //10 minutes

async function genericSaveDefinitions(data, the_dict) {
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
async function saveManifestDefinitions(data) {
    //await genericSaveDefinitions(data, DD.manifest_de)
    await DD.writeToFile("default_manifest", data);
};
async function saveSandboxDefinitions(data) {
    await genericSaveDefinitions(data, DD.perk_definitions);
    console.log("saved perk definitions");
}
async function saveLoreDefinitions(data) {
    await genericSaveDefinitions(data, DD.lore_directory);
    console.log("saved lore definitions");
}
async function savePlugsetDefinitions(data) {
    await genericSaveDefinitions(data, DD.plugset_definitions);
}
async function saveSockettypeDefinitions(data) {
    await genericSaveDefinitions(data, DD.sockettype_definitions);
}
async function saveDamagetypeDefinitions(data) {
    await genericSaveDefinitions(data, DD.damagetype_definitions);
}


class destiny_commands {
    static destiny_show = async function(target, id){
        console.log(`Show ${target} ${id}\n`);
        try {
            switch (target)
            {
                case "weapon":
                    console.log(`condition tests: ${id == true}, ${id == false}, ${id != null}, ${id.length}, ${id}.}`);
                    console.log("final test: ", (id && id.length == 0));
                    if(id && id.length != 0){
                        console.log(DD.weapon_directory[id]); 
                    } else{ console.log("categorised guns:"); console.log(DD.categorised_guns); }
                    break;
                case "character":
                    console.log(DD.player_directory[id]); break;
                case "socket":
                    if(id && id.length != 0){
                        console.log(DD.socket_directory[id]); 
                    } else{ 
                        console.log("categorised sockets:"); 
                        //console.log(Object.keys(DD.categorised_sockets)); 
                        console.log(DD.weapon_to_socket);    
                    }
                    break;
            }
        }
        catch{ console.log(`Doesn't contain id ${id}.`); }
        return;
    }
    static destiny_manifest = async function(type, id){
        console.log(`Manifest ${type} ${id}`);
        let operation = new DestinyRequest(false, false);
        let r_url = "";
        try{
            switch (type)
            {
                case "weapon":
                    console.log("id ", id, " equals:", (id == "all"));
                    switch(id[0]) {
                        case "all":
                            console.log("in weapon all");
                            let weapon_keys = Object.keys(DD.weapon_directory);
                            for(let i in weapon_keys){
                                let key = weapon_keys[i];
                                let r_url; let weapon_data;
                                if(DD.weapon_directory[key] == false){
                                    //r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + key + "/";
                                    r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + key + "/";
                                    weapon_data = await operation.create(r_url, {
                                        //"components":"300"
                                    },
                                        false, "GET"
                                    );
                                    await DD.saveResults(weapon_data);
                                }
                            }
                            break;
                        case "definitions":
                            console.log("in definitions");
                            /*let def_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinyInventoryItemDefinition-95a3dcd4-f936-49a9-b327-83feea26c2f1.json";
                            let weapon_defs = await operation.create(def_url, {},
                                false, "GET"
                            );*/
                            await DD.saveWeaponDefinitions(DD.item_definitions);
                            break;
                        default:
                            console.log("in specific");
                            let spec_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + id + "/";
                            let item_definition = await operation.create(spec_url, {
                                //"components":"300"
                            },
                                false, "GET"
                            );
                            await DD.printResults(item_definition);
                            break;
                    } 
                    break;
                case "socket":
                    switch(id[0]) {
                        case "all":
                            break;
                        case "definitions":
                            console.log("in definitions");
                            let r_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinySandboxPerkDefinition-95a3dcd4-f936-49a9-b327-83feea26c2f1.json";
                            await operation.create(r_url, {},
                                saveSandboxDefinitions, "GET"
                            );
                            break;
                    }
                    break;
                case "lore":
                    console.log("Manifest lore?");
                    let lore_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinyLoreDefinition-95a3dcd4-f936-49a9-b327-83feea26c2f1.json";
                    await operation.create(lore_url, {
                        //"components":"300"
                    },
                        saveLoreDefinitions, "GET"
                    );
                    break;
                case "plugset":
                    console.log("Manifest plugset?");
                    let plugset_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinyPlugSetDefinition-95a3dcd4-f936-49a9-b327-83feea26c2f1.json";
                    await operation.create(plugset_url, {
                        //"components":"300"
                    },
                        savePlugsetDefinitions, "GET"
                    );
                    break;
                case "sockettype":
                    console.log("Manifest socket types?");
                    let sockettype_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinySocketTypeDefinition-95a3dcd4-f936-49a9-b327-83feea26c2f1.json";
                    await operation.create(sockettype_url, {
                        //"components":"300
                    },
                        saveSockettypeDefinitions, "GET"
                    );
                    break;
                case "damagetype":
                    console.log("Manifest damage types?");
                    let damagetype_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinyDamageTypeDefinition-95a3dcd4-f936-49a9-b327-83feea26c2f1.json";
                    await operation.create(damagetype_url, {},
                        saveDamagetypeDefinitions, "GET"
                    );
                    break;
                default:
                    console.log("Manifest default?");
                    let default_url = "https://www.bungie.net/platform/Destiny2/Manifest/";
                    await operation.create(default_url, {
                        //"components":"300"
                    },
                        saveManifestDefinitions, "GET"
                    );
                    break;
            }
        }
        catch(err){ console.log(err); }
        return;
    };
    static destiny_read = async function(type, id){
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
                            let weapon_keys = Object.keys(DD.weapon_directory);
                            let key; let socket; let plug_hash;
                            for(let i in weapon_keys){
                                key = weapon_keys[i];
                                for(let j = 0; j < DD.item_definitions[key]["sockets"]["socketEntries"].length; j++)
                                {
                                    socket = DD.item_definitions[key]["sockets"]["socketEntries"][j];
                                    if("reusablePlugItems" in socket){
                                        for(let k = 0; k < socket["reusablePlugItems"].length; k++){
                                            //console.log(`plug #${j}.`);
                                            plug_hash = socket["reusablePlugItems"][k]["plugItemHash"];
                                            r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + plug_hash + "/";
                                            let socket_def = await DestinyRequest.create(r_url, {
                                                //"components":"300"
                                            },
                                                false, "GET"
                                            );
                                            await DD.saveSocket(socket_def);
                                        }
                                    }
                                }
                                if(DD.weapon_directory[key] == false){
                                    //r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + key + "/";
                                    r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + key + "/";
                                    await DestinyRequest.create(r_url, {
                                        //"components":"300"
                                    },
                                        saveResults, "GET"
                                    );
                                }
                            }
                            break;
                        default:
                            //console.log(item_definitions[id]); 
                            //await DD.writeToFile("test_output", DD.item_definitions[id]["sockets"]["socketEntries"]);
                            let num = 0; let num_2 = 0;
                            let segment = DD.item_definitions[id]["sockets"]["socketEntries"];
                            for(let entry in segment) {
                                if("socketTypeHash" in segment[entry]) {
                                    let socket_type = DD.sockettype_definitions[segment[entry]["socketTypeHash"]];
                                    await DD.writeToFile(`socket_${num}_type`, socket_type);
                                }
                                if("reusablePlugSetHash" in segment[entry]) {
                                    let plugset = DD.plugset_definitions[segment[entry]["reusablePlugSetHash"]];
                                    if(false && "reusablePlugItems" in plugset){
                                        let plug_items = plugset["reusablePlugItems"];
                                        num_2 = 0;
                                        for(let plug in plug_items) {
                                            if("plugItemHash" in plug_items[plug]){
                                                let socket = DD.item_definitions[plug_items[plug]["plugItemHash"]];
                                                await DD.writeToFile(`socket_${num}_${num_2}`, socket);
                                                ++num_2;
                                            }
                                        }
                                    }
                                    
                                    ++num;
                                }
                            }
                            //console.log();
                            
                            break;
                    }
                    break;
            }
        }
        catch(err){ console.log(err); }
        return;
    };
    static destiny_save = async function(type, id){
        console.log(`Save ${type} ${id}`);
        try{
            switch(type)
            {
                case "weapon":
                    DD.writeToFile("weapon_directory", DD.weapon_directory);
                    //writeToFile("DestinyInventoryItemDefinition", item_definitions); 
                    break;
                case "lore":
                    DD.writeToFile("lore_directory", DD.lore_directory); break;
                case "socket":
                    //writeToFile("socket_directory", socket_directory);
                    DD.writeToFile("socket_to_weapon", DD.socket_to_weapon);
                    DD.writeToFile("weapon_to_socket", DD.weapon_to_socket);
                    //writeToFile("DestinySandboxPerkDefinition", socket_definitions);
                    break;
                case "everything":
                    console.log("inside of save all switchcase");
                    DD.writeToFile("lore_directory", DD.lore_directory);
                    DD.writeToFile("DestinySandboxPerkDefinition", DD.perk_definitions);
                    DD.writeToFile("DestinyInventoryItemDefinition", DD.item_definitions); 
                    DD.writeToFile("DestinySocketTypeDefinition", DD.sockettype_definitions); 
                    DD.writeToFile("DestinyPlugSetDefinition", DD.plugset_definitions);
                    DD.writeToFile("DestinyDamageTypeDefinition", DD.damagetype_definitions);

                    DD.writeToFile("weapon_directory", DD.weapon_directory);
                    DD.writeToFile("socket_directory", DD.socket_directory);
                    DD.writeToFile("socket_to_weapon", DD.socket_to_weapon);
                    DD.writeToFile("weapon_to_socket", DD.weapon_to_socket);
                    console.log("hopefully all those files were written");
            }
        }
        catch(err){ console.log(err); }
        return;
    };
    static destiny_drop = async function(type, id){
        console.log(`Drop ${type} ${id}\n`);
        try {
            switch (type)
            {
                case "weapon":
                    DD.writeToFile("weapon_directory", "");
                    break;
                case "socket":
                    DD.writeToFile("socket_directory", "");
                    DD.writeToFile("weapon_to_socket", "");
                    DD.writeToFile("socket_to_weapon", "");
                    break;
            }
        }
        catch{ console.log(`Doesn't contain id ${id}.`); }
        return;
    };
};

module.exports = destiny_commands;