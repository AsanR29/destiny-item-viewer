// only trigger on the server's commandline

import {destiny_data as DD} from "../scripts/destiny_data.js";
import {DestinySQL} from "./destiny_sql.js";
import {DestinyRequest} from "../scripts/destiny_request.js";

export class destiny_commands {
    static destiny_show = async function(target : string, id : string){
        console.log(`Show ${target} ${id}\n`);
        id = String(id);
        try {
            switch (target)
            {
                case "weapon":
                    if(id && id.length != 0){
                        console.log(DD.item_definitions[id]);
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
                        console.log(DD.categorised_sockets);
                    }
                    break;
            }
        }
        catch{ console.log(`Doesn't contain id ${id}.`); }
        return;
    }
    static destiny_manifest = async function(type : string, id : string){
        console.log(`Manifest ${type} ${id}`);
        try {
            switch(type){
                case "everything":
                    await DestinyRequest.fetchManifest();
                    break;
            }
        }
        catch{ console.log(`Error trying to Manifest.`); }
        return;
    };
    static destiny_read = async function(type : string, id : string){
        console.log(`Read ${type} ${id}`);
        return;
    };
    static destiny_save = async function(type : string, id : string){
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
                    DD.writeToFile("DestinyLoreDefinition", DD.lore_directory);
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
    static destiny_drop = async function(type : string, id : string){
        console.log(`Drop ${type} ${id}\n`);
        try {
            switch (type)
            {
                case "weapon":
                    DD.writeToFile("weapon_directory", {});
                    break;
                case "socket":
                    DD.writeToFile("socket_directory", {});
                    DD.writeToFile("weapon_to_socket", {});
                    DD.writeToFile("socket_to_weapon", {});
                    break;
            }
        }
        catch{ console.log(`Doesn't contain id ${id}.`); }
        return;
    };
    static destiny_create = async function(type : string, id : string){
        console.log(`Create ${type} ${id}`);
        try {
            switch(type) {
                case "database":
                    await DestinySQL.createTables();
                    break;
            }
        }
        catch(err){ console.log(`Failed to create databases. ${err}`); }
        return;
    }
};

//module.exports = destiny_commands;