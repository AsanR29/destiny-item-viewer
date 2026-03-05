'use strict';
const { DatabaseSync } = require('node:sqlite');
//const database = new DatabaseSync('data/database.db');

// Pull table creation SQL strings from a json
const fs = require('node:fs');
const crypto = require('node:crypto');

var table_commands = {};
try{
    table_commands = JSON.parse(fs.readFileSync("table_commands"+".json", "utf8"));
} catch{ 
    table_commands = {
        "destiny_player": false,
        "admin_passwords": false,
    }; }

//
class DBTable {
    constructor(){ this.momento = {}; }
    addColumn(name, type){
        this.momento[name] = type;
        return this;    // to let me string it? as in string along. like cout <<
    }
    cutDown(wanted_params){
        let my_params = Object.keys(this.momento);
        for(let i = 0; i < my_params.length; i++) {
            if(my_params[i] in wanted_params){ continue; }
            // else
            delete this.momento[my_params[i]];
        }
    }
    copyMomento(){
        var new_obj = new DBTable();
        new_obj.momento = Object.assign({}, this.momento);
        return new_obj;
    }
}
//
var table_prototypes = {
    "destiny_player": new DBTable()
        .addColumn("player_id", Number)
        .addColumn("bungie_net_id", Number)
        .addColumn("display_name", String)
        .addColumn("display_name_code", Number)
        .addColumn("password", String)
        .addColumn("salt", String)
        .addColumn("account_type", Number)
        .addColumn("account_creation", Date),
    "admin_passwords": new DBTable()
        .addColumn("admin_id", Number)
        .addColumn("endpoint_password", String)
};

class DestinySQL {
    constructor(){}
    // player
    static async createTables() {
        const database = new DatabaseSync('data/database.db');
        database.exec(table_commands.destiny_player);
        database.exec(table_commands.admin_passwords);
        database.close();
    }
    static async insertPlayer(player_obj,password) {
        const database = new DatabaseSync('data/database.db');
        let current_time = Math.floor(Date.now()/60000);    //1000 for milliseconds, 60 for seconds. To the minute.
        let salt = crypto.randomBytes(255); // is this bytea
        let password_hashed = crypto.scryptSync(password, salt, 64).toString('base64');
        
        let sql_command = "INSERT INTO destiny_players(bungie_net_id,display_name,display_name_code,password,salt,account_type,account_creation) VALUES(?, ?, ?, ?, ?, ?, ?);"
        let values = [parseInt(player_obj.bungieNetId),player_obj.displayName,parseInt(player_obj.displayNameCode),password_hashed,salt,player_obj.accountType,current_time];

        let insert = database.prepare(sql_command);
        
        let result_1 = insert.run(...values);
        database.close();

        return result_1;
    }
    static async loadPlayer(bungieNetId,password) {
        bungieNetId = parseInt(bungieNetId);
        console.log(bungieNetId);
        const database = new DatabaseSync('data/database.db');
        let sql_command = "SELECT * FROM destiny_players WHERE bungie_net_id = (?)";
        let values = [bungieNetId];

        let select = database.prepare(sql_command);
        let result_1 = select.all(...values);   //.get for only 1. .all for all
        database.close();

        let salt = result_1[0]["salt"];
        let password_hashed = crypto.scryptSync(password, salt, 64).toString('base64');
        if(password_hashed == result_1[0]["password"]) {
            return {"account_type": result_1[0]["account_type"]}; //the only piece of information they could want >:?
        } else { return false; }
    }
}



module.exports = DestinySQL;