'use strict';
import {DatabaseSync} from 'node:sqlite';
//const database = new DatabaseSync('data/database.db');

// Pull table creation SQL strings from a json
import fs from 'node:fs';
import crypto from 'node:crypto';

import {InputDestinyPlayer} from './destiny_typemodels.js';

var table_commands : { [key: string]: string | boolean };
try{
    table_commands = JSON.parse(fs.readFileSync("table_commands"+".json", "utf8"));
} catch{ 
    table_commands = {
        "destiny_player": false,
        "admin_passwords": false,
    }; }
//
interface TypeMap { [key: string]: StringConstructor | NumberConstructor; };


interface LoadPlayerResponse {
    salt : string;
    password : string;
    account_type : number;
} function assertPlayerResponse(val : any) : val is LoadPlayerResponse {
    if("salt" in val && "password" in val && "account_type" in val){ 
        return true; 
    } // else
    return false;
}

class DBTable {
    momento : TypeMap; //Map<string, StringConstructor | NumberConstructor>;
    constructor(){ this.momento = {}; }
    addColumn(name : string, type : any){
        this.momento[name] = type;
        return this;    // to let me string it? as in string along. like cout <<
    }
    cutDown(wanted_params : TypeMap){
        let my_params = Object.keys(this.momento);
        for(let i = 0; i < my_params.length; i++) {
            let param = my_params[i];
            if(!param){ continue; }
            if(param in wanted_params){ continue; }
            // else
            delete this.momento[param];
        }
    }
    copyMomento(){
        var new_obj = new DBTable();
        new_obj.momento = Object.assign({}, this.momento);
        return new_obj;
    }
}
//
interface TablePrototype { [key: string] : DBTable; }
const table_prototypes : TablePrototype = {
    destiny_player: new DBTable()
        .addColumn("player_id", Number)
        .addColumn("bungie_net_id", Number)
        .addColumn("display_name", String)
        .addColumn("display_name_code", Number)
        .addColumn("password", String)
        .addColumn("salt", String)
        .addColumn("account_type", Number)
        .addColumn("account_creation", Date),
    admin_passwords: new DBTable()
        .addColumn("admin_id", Number)
        .addColumn("endpoint_password", String)
};

export class DestinySQL {
    constructor(){}
    // player
    static async createTables() {
        const database = new DatabaseSync('data/database.db');
        let cmd;
        cmd = table_commands['destiny_player'];
        if(cmd === typeof 'string'){
            database.exec(cmd);
        }
        cmd = table_commands.admin_passwords;
        if(cmd === typeof 'string'){
            database.exec(cmd);
        }
        database.close();
    }
    static async insertPlayer(player_obj : InputDestinyPlayer, password : string) {
        const database = new DatabaseSync('data/database.db');
        let current_time = Math.floor(Date.now()/60000);    //1000 for milliseconds, 60 for seconds. To the minute.
        let salt = crypto.randomBytes(255); // is this bytea
        let password_hashed = crypto.scryptSync(password, salt, 64).toString('base64');
        
        let sql_command = "INSERT INTO destiny_players(bungie_net_id,display_name,display_name_code,password,salt,account_type,account_creation) VALUES(?, ?, ?, ?, ?, ?, ?);"
        let values = [player_obj.bungieNetId,player_obj.displayName,parseInt(player_obj.displayNameCode),password_hashed,salt,player_obj.accountType,current_time];

        let insert = database.prepare(sql_command);
        
        let result_1 = insert.run(...values);
        database.close();

        return result_1;
    }
    static async loadPlayer(bungieNetId : number, password : string) {
        const database = new DatabaseSync('data/database.db');
        let sql_command = "SELECT * FROM destiny_players WHERE bungie_net_id = (?)";
        let values = [bungieNetId];

        let select = database.prepare(sql_command);
        let result_1 = select.all(...values);   //.get for only 1. .all for all
        database.close();

        let record = result_1[0];
        if(!assertPlayerResponse(record)){ return false; } // else
        let salt = record["salt"];
        let password_hashed = crypto.scryptSync(password, salt, 64).toString('base64');
        if(password_hashed == record["password"]) {
            return {"account_type": record["account_type"]}; //the only piece of information they could want >:?
        } else { return false; }
    }
}

//module.exports = DestinySQL;