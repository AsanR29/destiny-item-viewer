





class DestinyPlayer {
    constructor(SESSION_ID,displayName,displayNameCode) { 
        this.session_id = SESSION_ID;
        this.displayName = displayName;
        this.displayNameCode = displayNameCode;

        this.chara_ids = [];
        this.chara_metadata = [];
        this.membershipType = false;
        this.membershipId = false;

        this.vault = [];
        this.equipment = [];
        this.inventory = [];
    }
    static copy(other_player) {
        let new_player = DestinyPlayer(other_player.session_id)
        //new_player.something = other_player.something;
        // etc
        return new_player;
    }

}

module.exports = DestinyPlayer;