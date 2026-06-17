import * as readline from 'node:readline';
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
});

// command_words
export class text_command {
    word : string;
    params : Array<string>;
    execute? : Function;
    static getCommand: { [key : string] : text_command } = {
        show: new text_command("show", ["weapon","character","lore","socket"]),
        manifest : new text_command("manifest", ["weapon","lore","socket","plugset","sockettype","damagetype", "everything"]),
        read : new text_command("read", ["weapon","socket"]),
        save : new text_command("save", ["weapon","character","lore","socket","everything"]),
        drop : new text_command("drop", ["weapon","socket"]),
        create : new text_command("create", ["database"]),
    };

    //static weapon = new text_command("weapon");
    //static character = new text_command("character");
    //static lore = new text_command("lore");


    constructor(word : string, params : Array<string>) {
        this.word = word;
        this.params = params;
        this.execute;// = new Function();
    }
}
const word_lookup = ["show", "weapon", "character", "lore", "socket", "manifest", "save", "read", "drop", "plugset", "sockettype", "damagetype", "everything", "create", "database"];


function sad () { console.log(":("); };

const get_line = (resolve_func : Function) => {
    rl.question("Enter command.\n", (command : string) => {resolve_func(command)});
}

const promise_run = (resolve_func : Function) => new Promise(resolve_func=> {
    rl.question("Enter command.\n", (command : string) => {resolve_func(command)});
});

export class Zebra {
    constructor() { 
        //this.run = promise_run;
    }

    static tokenise(cmd : string) : Array<string> {
        var token_list = cmd.split(" ");
        if(token_list == undefined){
            token_list = [cmd];
        }
        //rl.write(token_list);
        // any other cleaning to do?
        return token_list;
    }

    static async run() {
        //rl.question("Enter command.", command => {
        //    console.log(`Recieved: ${command}`);
        //});
        //rl.write("Running again\n");
        console.log("Running again");
        //rl.question("Enter command.\n", command => Zebra.first_responder(command));
        //return await promise_run(Zebra.first_responder);
        return await new Promise((resolve) => 
            {
                get_line((answer : string) => resolve(Zebra.first_responder(answer)));
            }
        );
    }

    static async first_responder(command : string) {
        console.log(`\ncommand: ${command}`);
        var token_list : Array<string>;
        token_list = Zebra.tokenise(command);
        var state = 0;
        var word : string = '';
        var param_list = [];
        var data = [];

        var valid = true;
        let token : string;
        for(let i in token_list){
            token = token_list[i]!;
            console.log(`token: ${token}`);
            switch(state){
                case 0:
                    if (word_lookup.includes(token)){
                        word = token;
                        console.log(`cmd ${token}`);
                        state = 1;
                    }
                    else{ valid = false; }
                    break;
                case 1:
                    let cmd = text_command.getCommand[word!];
                    if(cmd && cmd.params.includes(token)) {
                        console.log(`word param ${token}.`);
                        param_list.push(token);
                        break;
                    }
                    else{
                        state = 2;  
                        // fall-through to case 2, on purpose.
                    }
                case 2:
                    data.push(token);
                    break;
            }
            if(!valid){ console.log("Invalid command format."); return; }
        }
        if(word == ''){ return; }
        console.log(`We understood cmd:${word} params:${param_list} data:${data};`);
        // it's been validated and packaged
        let cmd_a, cmd_b, cmd_c;
        cmd_a = text_command.getCommand[word];
        if(cmd_a) cmd_b = cmd_a.execute;
        if(cmd_b)
            switch(param_list.length) {
                case 0:
                    cmd_b(data); break;
                case 1:
                    cmd_b(param_list[0],data); break;
                case 2:
                    cmd_b(param_list[0],param_list[1],data); break;
                case 3:
                    cmd_b(param_list[0],param_list[1],param_list[2],data); break;
            }
        return;
    }
    
}


//module.exports = {Zebra, text_command};