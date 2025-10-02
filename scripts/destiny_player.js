

const DestinySQL = require("../scripts/destiny_sql");

const AccountType = Object.freeze({
    PLAYER: 0,
    ADMIN:9,
});

class PlayerSession {
    constructor(displayName,displayNameCode,password) {
        this.displayName = displayName;
        this.displayNameCode = displayNameCode;
        this.password = password;
        this.logged_in = false;
    }
}

class DestinyPlayer {
    constructor(SESSION_ID,displayName,displayNameCode) { 
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
    static copy(other_player) {
        let new_player = DestinyPlayer(other_player.session_id);
        //new_player.something = other_player.something;
        // etc
        return new_player;
    }
    //
    static createAdmin(SESSION_ID,displayName,displayNameCode,password) {
        if(password != process.env.ENDPOINT_PASSWORD){ return false; }
        let new_account = new DestinyPlayer(SESSION_ID,displayName,displayNameCode);
        new_account.accountType = AccountType.ADMIN; return new_account;
    }
    isAdmin() { return (this.accountType == AccountType.ADMIN ? true : false) }

    async login(player_session) {
        let result_1 = await DestinySQL.loadPlayer(this.bungieNetId,player_session.password);
        if(!result_1) { return false; }
        //else
        player_session.logged_in = true;
        this.accountType = result_1.account_type;   //in case it was different
        return true;
    }
    async signup(player_session) {
        let result_1 = await DestinySQL.insertPlayer(this,player_session.password);
        player_session.logged_in = true;
        if(!result_1) { return false; }
        //else
        return true;
    }
}

module.exports = {DestinyPlayer,PlayerSession};