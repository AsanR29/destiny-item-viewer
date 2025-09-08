var http = require('http');
const { URLSearchParams } = require('url');

const DD = require("../scripts/destiny_data");
const DestinyPlayer = require("./destiny_player");

class DestinyRequest {
    static BUNGIE_ENDPOINTS = { 
        "Manifest" : "https://www.bungie.net/platform/Destiny2/Manifest/" 
        //item_definitions : 
        //
    };
    static async fetchManifest() {
        let r_url = this.BUNGIE_ENDPOINTS["Manifest"];
        let manifest_opp = new DestinyRequest(false,false);
        let result = await manifest_opp.create(r_url,{},
            false, "GET"
        );
        let manifest_data = result.Response["jsonWorldComponentContentPaths"]["en"];
        DD.writeToFile("default_manifest",manifest_data);   //happening async
        // each one
        let endpoint_names = Object.keys(manifest_data);
        for(let i = 0; i < endpoint_names.length; i++) {
            this.BUNGIE_ENDPOINTS[endpoint_names[i]] = manifest_data[endpoint_names[i]];
        }   // like "DestinyLoreDefinition" : "/common/url+?%randomlygeneratedhash.json"

        let prefix = "https://www.bungie.net";

        // this can all happen async tbh
        let lore_opp = new DestinyRequest(false, {"target":DD.lore_directory});
        lore_opp.create(
            prefix+this.BUNGIE_ENDPOINTS["DestinyLoreDefinition"],{},
            lore_opp.genericSaveDefinitions.bind(lore_opp), "GET"
        ).then(DD.writeToFile("DestinyLoreDefinition",DD.lore_directory));

        let item_opp = new DestinyRequest(false, {"target":DD.item_definitions});
        item_opp.create(
            prefix+this.BUNGIE_ENDPOINTS["DestinyInventoryItemDefinition"],{},
            item_opp.genericSaveDefinitions.bind(item_opp), "GET"
        ).then(DD.writeToFile("DestinyInventoryItemDefinition",DD.item_definitions));

        let sandbox_opp = new DestinyRequest(false, {"target":DD.perk_definitions});
            sandbox_opp.create(
            prefix+this.BUNGIE_ENDPOINTS["DestinySandboxPerkDefinition"],{},
            sandbox_opp.genericSaveDefinitions.bind(sandbox_opp), "GET"
        ).then(DD.writeToFile("DestinySandboxPerkDefinition",DD.perk_definitions));

        let socket_opp = new DestinyRequest(false, {"target":DD.sockettype_definitions});
        socket_opp.create(
            prefix+this.BUNGIE_ENDPOINTS["DestinySocketTypeDefinition"],{},
            socket_opp.genericSaveDefinitions.bind(socket_opp), "GET"
        ).then(DD.writeToFile("DestinySocketTypeDefinition",DD.sockettype_definitions));

        let plugset_opp = new DestinyRequest(false, {"target":DD.plugset_definitions});
        plugset_opp.create(
            prefix+this.BUNGIE_ENDPOINTS["DestinyPlugSetDefinition"],{},
            plugset_opp.genericSaveDefinitions.bind(plugset_opp), "GET"
        ).then(DD.writeToFile("DestinyPlugSetDefinition",DD.plugset_definitions));

        let damagetype_opp = new DestinyRequest(false, {"target":DD.damagetype_definitions});
        damagetype_opp.create(
            prefix+this.BUNGIE_ENDPOINTS["DestinyDamageTypeDefinition"],{},
            damagetype_opp.genericSaveDefinitions.bind(damagetype_opp), "GET"
        ).then(DD.writeToFile("DestinyDamageTypeDefinition",DD.damagetype_definitions));

    }
    constructor(SESSION_ID, data) { 
        this.session_id = SESSION_ID;
        //this.API_KEY = API_KEY;
        this.data = data;
        this.run_info = {};
    }
    async loginUser(form) {
        console.log(" LOG IN USER ");
        const base_auth_url = "https://www.bungie.net/en/OAuth/Authorize";
        const token_url = "https://www.bungie.net/platform/app/oauth/token/";

        //dictionary to hold extra headers
        const HEADERS = {"X-API-Key":DD.API_KEY};
        let membershipType = "All";

        let url = 'https://www.bungie.net/platform/Destiny2/SearchDestinyPlayerByBungieName/' + membershipType + '/';
        let User = {"displayName":form.displayName, "displayNameCode":form.displayNameCode};

        DD.player_directory[this.session_id] = new DestinyPlayer(this.session_id,form.displayName,form.displayNameCode); 
        return await this.create(url, User,
            false, "POST"
        );
        return true;
    }

    async getItems(data) {
        console.log("in getItems");
        let player = DD.player_directory[this.session_id];
        let ids = Object.keys(data.Response["characters"].data);

        for(let i = 0; i < 3; i++)
        {
            player.chara_ids[i] = ids[i];
            player.chara_metadata = data.Response["characters"].data[ids[i]];
        }
        
        let r_url = "https://www.bungie.net/platform/Destiny2/" + player.membershipType + "/Profile/" + player.membershipId;
        return await this.create(r_url, {
            "components":"102"
        },
            false, "GET" //getItemDetail, "GET"
        );
    };
    async getCharacters(data) {
        let player = DD.player_directory[this.session_id];
        player.membershipType = data.Response[0]["membershipType"];
        player.membershipId = data.Response[0]["membershipId"];
        let r_url = "https://www.bungie.net/platform/Destiny2/" + player.membershipType + "/Profile/" + player.membershipId;
        let result = await this.create(r_url, {
            "components":"Characters"
        },
            false, "GET"
        );
        return result;
    };
    async getItemInstance(itemInstanceId) {
        let player = DD.player_directory[this.session_id];
        let r_url = "https://www.bungie.net/platform/Destiny2/" + player.membershipType + "/Profile/" + player.membershipId + "/Item/" + itemInstanceId + "/";

        let result = await this.create(r_url, {
            "components":305
        },
            false, "GET"
        );
        return result;
    };
    async create(url, body_params, next_function, method_type) {
        try {
            // Create the URL
            var r_url = url;

            // Create the headers
            const headers = {
                'Content-Type': 'application/json',
                "X-API-Key": DD.API_KEY
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
                response = await fetch(r_url, { method: method_type, headers });
            }

            // Check the response status
            if (!response.ok) {
                if(response.status == 503) {
                    return CreateError(response.status, r_url);
                } else {
                    throw new Error(`HTTP error! Status: ${response.status}. url: ${r_url}`); 
                }
            }

            // Parse the JSON response
            const data = await response.json();
            if(next_function){ console.log("next function!"); await next_function(data); }
            return data;
        } catch (error) {
            // Handle any errors
            console.error('Error:', error);
        }
    };
    // doesn't use create. Is ONLY a response to create
    async genericSaveDefinitions(def_data, the_dict=false) {
        if("Response" in def_data){ def_data = def_data.Response; }
        if(the_dict == false){ 
            try{ the_dict = this.data["target"]; } catch{ 
            console.log("Failed to identify dict to save definitions in."); 
            return false; } }

        let def_keys = Object.keys(def_data);
        let entry, string_key;
        for(let i =0; i < def_keys.length; i++)
        {
            entry = def_data[def_keys[i]];
            string_key = def_keys[i].toString();
            if(!(string_key in the_dict))
            {
                the_dict[string_key] = entry;
            }
        }
        return;
    }
}

function CreateError(code,r_url) { 
    return errors[code].clone(r_url);
}   // to look pretty
class request_error {
    constructor(code,next_function){
        this.is_error = true;
        this.code = code;
        this.r_url = false;
        this.next_function = next_function;
    }
    clone(r_url){
        var new_error = new request_error(this.code,this.next_function);
        new_error.r_url = r_url; // new attribute
        return new_error;
    }
}
const errors = {
    503: new request_error(503,error_msg_page)  //idk
}
function error_msg_page(res){
    res.render("destiny/503"); return;
}

module.exports = DestinyRequest;