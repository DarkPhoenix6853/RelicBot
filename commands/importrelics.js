exports.permissions = (client) => {
    return perms = {
        botChannel: true,           //If true, bot only responds in bot channels
        adminBotChannel: true,     //If true, bot only responds in admin bot channels
        role: client.config.get('perms').dev     //Last word specifies permission level needed to use this command
    }
}

//This code is run when the command is executed
exports.run = (client, message, args) => {
    //import the json list of relics
    let relics = require("../relics.json");
    //one by one add them to the DB
    for (let i = 0; i < relics.length; i++) {
        client.DBEnmap.set(relics[i], []);
    }
    message.channel.send(`${relics.length} relics imported - Last updated 30th September 2020`);

    console.log(`Relic list import by ${message.author.username}`);

};