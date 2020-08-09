const Discord = require("discord.js");
const Enmap = require("enmap");
const fs = require("fs");

const client = new Discord.Client();
const baseConfig = require("./config/baseConfig.json");
const identity = require("./config/ignore/identity.json");
const perms = require("./config/permsConfig.json");
const channelConfig = require("./config/channelConfig.json");
const cron = require("cron");

//attach config files to client so commands can see them
client.config = new Enmap();
client.config.set('baseConfig', baseConfig);
client.config.set('identity', identity);
client.config.set('perms', perms);
client.config.set('channelConfig', channelConfig);

process.on('unhandledRejection', function(err, promise) {
    console.error('Unhandled rejection (promise: ', promise, ', reason: ', err, ').');

    let logChannel = client.channels.find(channel => channel.id === client.config.get('channelConfig').logChannel);

    logChannel.send(`<@198269661320577024>, some kind of unhandled rejection has occured. Check out the console log.`);
});

let recurringStatus = new cron.CronJob('00 00 00,12 * * *', status);
recurringStatus.start();

//-----add events-----
//get files from events folder
fs.readdir("./events/", (err, files) => {
    //if there's an error, throw it
    if (err) return console.error(err);

    console.log(`\nLoading event handlers:`);
    //for each event file
    files.forEach(file => {
        if (!file.endsWith(".js")) return;

        //grab the file
        const event = require(`./events/${file}`);
        //use the file name to name the event
        let eventName = file.split(".")[0];
        console.log(`Loading ${eventName}`);
        //bind to client
        if(eventName == 'ready') {
            client.once(eventName, event.bind(null, client));
        } else {
            client.on(eventName, event.bind(null, client));
        }
    });
});

//-----add event functions-----
//create object to hold them
client.eventFuncs = new Enmap();

//get files from commands folder
fs.readdir("./eventfunctions/", (err, files) => {
    //if there's an error, throw it
    if (err) return console.error(err);

    console.log(`\nLoading event functions:`);
    //for each command file
    files.forEach(file => {
        //if it's not a javaScript file, ignore it
        if (!file.endsWith(".js")) return;
        //require the file
        let props = require(`./eventfunctions/${file}`);
        //get the command name from the file name
        let eFuncName = file.split(".")[0];
        //display on the console
        console.log(`Loading ${eFuncName}`);
        //add to list
        client.eventFuncs.set(eFuncName, props);
    });
});

//-----add commands-----
//create object to hold them
client.commands = new Enmap();

//get files from commands folder
fs.readdir("./commands/", (err, files) => {
    //if there's an error, throw it
    if (err) return console.error(err);

    console.log(`\nLoading commands:`);
    //for each command file
    files.forEach(file => {
        //if it's not a javaScript file, ignore it
        if (!file.endsWith(".js")) return;
        //require the file
        let props = require(`./commands/${file}`);
        //get the command name from the file name
        let commandName = file.split(".")[0].toLowerCase();
        //display on the console
        console.log(`Loading ${commandName}`);
        //add to list
        client.commands.set(commandName, props);
    });
});

client.login(identity.token);

function status() {
    let customStatus = {
        status: 'online',
        afk: false,
        game: {
            type: 2,
            name: "++guide"
        }
    }

    client.user.setPresence(customStatus)
    .catch(console.error);
}
