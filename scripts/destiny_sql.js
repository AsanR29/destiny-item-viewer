const {Pool, Client} = require("pg");
const crypto = require('node:crypto');

const server_credentials = {
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT
};
const database_credentials = { database: process.env.PG_DATABASE };
Object.assign(database_credentials, server_credentials);

const server_pool = new Pool(server_credentials);
const database_pool = new Pool(database_credentials);

const fs = require('node:fs');

var table_commands = {};
try{
    table_commands = JSON.parse(fs.readFileSync("table_commands"+".json", "utf8"));
} catch{ 
    table_commands = {
        "destiny_player": false,
        "admin_passwords": false,
    }; }

// IIFE (Immediately Invoked Function Expression)
(async () => {
    var startup_client;
    try{ 
        startup_client = await database_pool.connect();
    } catch(err) {
        let temp_client = await server_pool.connect();
        await temp_client.query(`CREATE DATABASE ${process.env.PG_DATABASE}`);
        temp_client.release();
        startup_client = await database_pool.connect();
    }

    
    try{
        /*const {rows} = await startup_client.query("SELECT current_user");
        const currentUser = rows[0]["current_user"];
        console.log(currentUser);*/
        var results = [];
        if(table_commands.destiny_player) {
            results.push(await startup_client.query(table_commands.destiny_player)); }
        if(table_commands.admin_passwords) {
            results.push(await startup_client.query(table_commands.admin_passwords)); }
    } catch(err) {
        console.log(err);
    } finally {
        startup_client.release();
    }
})();

class DestinySQL {
    constructor(){}
    // player
    static async insertPlayer(player_obj,password) {
        let current_time = "now";//Math.floor(Date.now()/60000);    //1000 for milliseconds, 60 for seconds. To the minute.
        let salt = crypto.randomBytes(255); // is this bytea
        let password_hashed = crypto.scryptSync(password, salt, 64).toString('base64');
        
        let sql_command = "INSERT INTO destiny_players(bungie_net_id,display_name,display_name_code,password,salt,account_type,account_creation) VALUES($1, $2, $3, $4, $5, $6, $7);"
        let values = [player_obj.bungieNetId,player_obj.displayName,parseInt(player_obj.displayNameCode),password_hashed,salt,player_obj.accountType,current_time];

        let client = await database_pool.connect();
        let result_1 = await client.query(sql_command,values);
        client.release();
        return result_1;
    }
    static async loadPlayer(bungieNetId,password) {
        let sql_command = "SELECT * FROM destiny_players WHERE bungie_net_id = $1";
        let values = [bungieNetId];
        let client = await database_pool.connect();
        let result_1 = await client.query(sql_command,values);
        client.release();

        let salt = result_1.rows[0]["salt"];
        let password_hashed = crypto.scryptSync(password, salt, 64).toString('base64');
        if(password_hashed == result_1.rows[0]["password"]) {
            return {"account_type": result_1.rows[0]["account_type"]}; //the only piece of information they could want >:?
        } else { return false; }
    }
}


module.exports = DestinySQL;