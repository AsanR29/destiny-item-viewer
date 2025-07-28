// only trigger on the server's commandline

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
async function saveSandboxDefinitions(data) {
    await genericSaveDefinitions(data, perk_definitions);
    console.log("saved perk definitions");
}
async function saveLoreDefinitions(data) {
    await genericSaveDefinitions(data, lore_directory);
    console.log("saved lore definitions");
}
async function savePlugsetDefinitions(data) {
    await genericSaveDefinitions(data, plugset_definitions);
}
async function saveSockettypeDefinitions(data) {
    await genericSaveDefinitions(data, sockettype_definitions);
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
                    } else{ console.log("categorised sockets:"); console.log(Object.keys(DD.categorised_sockets)); }
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
                            let weapon_keys = Object.keys(DD.weapon_directory);
                            for(let i in weapon_keys){
                                let key = weapon_keys[i];
                                let r_url; let weapon_data;
                                if(DD.weapon_directory[key] == false){
                                    //r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + key + "/";
                                    r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + key + "/";
                                    weapon_data = await DestinyRequest.create(r_url, {
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
                            r_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinyInventoryItemDefinition-4d61d37e-f133-44a3-a88c-2a0500303318.json";
                            let weapon_defs = await DestinyRequest.create(r_url, {},
                                false, "GET"
                            );
                            await DD.saveWeaponDefinitions(weapon_defs);
                            break;
                        default:
                            console.log("in specific");
                            r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + id + "/";
                            let item_definition = await DestinyRequest.create(r_url, {
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
                            let r_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinySandboxPerkDefinition-4d61d37e-f133-44a3-a88c-2a0500303318.json";
                            let sandbox_defs = await DestinyRequest.create(r_url, {},
                                DD.saveSandboxDefinitions, "GET"
                            );
                            break;
                    }
                    break;
                case "lore":
                    console.log("Manifest lore?");
                    let r_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinyLoreDefinition-4d61d37e-f133-44a3-a88c-2a0500303318.json";
                    let lore_defs = await DestinyRequest.create(r_url, {
                        //"components":"300"
                    },
                        DD.saveLoreDefinitions, "GET"
                    );
                    break;
                case "plugset":
                    console.log("Manifest plugset?");
                    r_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinyPlugSetDefinition-4d61d37e-f133-44a3-a88c-2a0500303318.json";
                    let plugset_defs = await DestinyRequest.create(r_url, {
                        //"components":"300"
                    },
                        DD.savePlugsetDefinitions, "GET"
                    );
                    break;
                case "sockettype":
                    console.log("Manifest socket types?");
                    r_url = "https://www.bungie.net/common/destiny2_content/json/en/DestinySocketTypeDefinition-4d61d37e-f133-44a3-a88c-2a0500303318.json";
                    let socket_defs = await DestinyRequest.create(r_url, {
                        //"components":"300
                    },
                        DD.saveSockettypeDefinitions, "GET"
                    );
                    break;
                default:
                    console.log("Manifest default?");
                    r_url = "https://www.bungie.net/platform/Destiny2/Manifest/";
                    let manifest_def = await DestinyRequest.create(r_url, {
                        //"components":"300"
                    },
                        DD.saveManifest, "GET"
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
                            console.log(DD.item_definitions[id]["sockets"]["socketEntries"][0]);
                            
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
};

module.exports = destiny_commands;