// only trigger on the server's commandline

const destiny_data = require("../scripts/destiny_data");
const DD = require("../scripts/destiny_data");
const DestinyRequest = require("../scripts/destiny_request");

async function save_data_command(){
    await destiny_commands.destiny_save("everything","");
    console.log("saved all (command)");
}
if(process.env.SAVE_STATIC == 1){
    setTimeout(save_data_command,600000);   //10 minutes
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
                        console.log(DD.categorised_sockets);
                    }
                    break;
            }
        }
        catch{ console.log(`Doesn't contain id ${id}.`); }
        return;
    }
    static destiny_manifest = async function(type, id){
        console.log(`Manifest ${type} ${id}`);
        return;
    };
    static destiny_read = async function(type, id){
        console.log(`Read ${type} ${id}`);
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