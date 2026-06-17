

import {DestinySQL} from "../scripts/destiny_sql.js";

import {InputDestinyPlayer} from "./destiny_typemodels.js";

/* interface AccountType { 
    [key:string]: number; 
    PLAYER: number; ADMIN: number; 
} */
enum AccountType {
    PLAYER = 0,
    ADMIN = 9,
};

export class PlayerSession {
    displayName : string;
    displayNameCode : string;
    password : string;
    logged_in : boolean;
    constructor(displayName : string,displayNameCode : string,password : string) {
        this.displayName = displayName;
        this.displayNameCode = displayNameCode;
        this.password = password;
        this.logged_in = false;
    }
}

export class DestinyPlayer {
    session_id : string;
    displayName : string;
    displayNameCode : string;
    bungieNetId : number | boolean;
    accountType : AccountType;

    chara_ids : Array<number>;
    chara_metadata : any;
    membershipType : number | boolean;
    membershipId : number | boolean;
    //
    weapon_uniques : any;
    vault : any;
    equipment : any;
    inventory : any;
    constructor(SESSION_ID : string,displayName : string,displayNameCode : string) { 
        this.session_id = SESSION_ID;
        this.displayName = displayName;
        this.displayNameCode = displayNameCode;
        this.bungieNetId = false;

        this.chara_ids = [];
        this.chara_metadata = [];
        this.membershipType = false;
        this.membershipId = false;

        this.weapon_uniques = {}; //weapon_directory for player instanced data
        this.vault = [];
        this.equipment = [];
        this.inventory = [];

        this.accountType = AccountType.PLAYER;
    }
    /*static copy(other_player : DestinyPlayer) {
        let new_player = DestinyPlayer(other_player.session_id);
        //new_player.something = other_player.something;
        // etc
        return new_player;
    }*/
    //
    static createAdmin(SESSION_ID : string,displayName : string,displayNameCode : string,password : string) {
        if(password != process.env.ENDPOINT_PASSWORD){ return false; }
        let new_account = new DestinyPlayer(SESSION_ID,displayName,displayNameCode);
        new_account.accountType = AccountType.ADMIN; return new_account;
    }
    isAdmin() { return (this.accountType == AccountType.ADMIN ? true : false) }

    async login(player_session : PlayerSession) {
        let bungie_net_id = this.bungieNetId;
        if(!(typeof bungie_net_id === 'number')){ return false; }
        let result_1 = await DestinySQL.loadPlayer(bungie_net_id,player_session.password);
        if(!result_1) { return false; }
        //else
        player_session.logged_in = true;
        this.accountType = result_1.account_type;   //in case it was different
        return true;
    }
    async signup(player_session : PlayerSession) {
        let result_1 = await DestinySQL.insertPlayer(this as InputDestinyPlayer,player_session.password);
        player_session.logged_in = true;
        if(!result_1) { return false; }
        //else
        return true;
    }
}

//module.exports = {DestinyPlayer,PlayerSession};