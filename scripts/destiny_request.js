var http = require('http');
const { URLSearchParams } = require('url');

const DD = require("../scripts/destiny_data");
const DestinyPlayer = require("./destiny_player");

class DestinyRequest {
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
        console.log("session_id ",this.session_id);
        DD.player_directory[this.session_id] = new DestinyPlayer(this.session_id,form.displayName,form.displayNameCode); /*{
            "displayName": form.displayName,
            "displayNameCode": form.displayNameCode
        };*/
        console.log("passed?");
        return await this.create(url, User,
            false, "POST"
        );
        return true;
    }

    async getItems(data) {
        console.log("in getItems");
        let player = DD.player_directory[this.session_id];
        let ids = Object.keys(data.Response["characters"].data);
        /*player.chara_ids = [];
        player.chara_metadata = [];*/
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
        console.log(typeof itemInstanceId, itemInstanceId);
        let player = DD.player_directory[this.session_id];
        //console.log(player);
        /*let inventory_data = data.Response["characterInventories"]["data"];
        let titan_inventory = inventory_data[player.chara_ids[0]]["items"];
        console.log(`\n\n---itemHash: ${titan_inventory[0]["itemHash"]}---\n\n`);*/
        console.log(itemInstanceId);
        let r_url = "https://www.bungie.net/platform/Destiny2/" + player.membershipType + "/Profile/" + player.membershipId + "/Item/" + itemInstanceId + "/";
        console.log(r_url);
        //let r_url = "https://www.bungie.net/platform/Destiny2/Manifest/DestinyInventoryItemDefinition/" + titan_inventory[0]["itemHash"] + "/";
        let result = await this.create(r_url, {
            "components":305
        },
            false, "GET"
        );
        return result;
        /*create(session_id,url=r_url,api_key=api_key, {},
            printResults, "GET"
        );*/
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
            if(next_function){ console.log("next function!"); await next_function(data); }
            return data;
        } catch (error) {
            // Handle any errors
            console.error('Error:', error);
        }
    };
}

module.exports = DestinyRequest;