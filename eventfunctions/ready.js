const Enmap = require('enmap');
const DBEnmap = new Enmap({ name: 'DB' });
const lobbyDB = new Enmap({ name: 'lobbyDB' });

const playerDB = new Enmap({name: 'playerDB'});

exports.onReady = async (client) => {
    await DBEnmap.defer;
    console.log(`\nLoaded ${DBEnmap.size} relics from database`);
    client.DBEnmap = DBEnmap;

    await lobbyDB.defer;
    if (!lobbyDB.has('nextLobby')) {
        console.log('Lobby counter not found - setting to 0');
        lobbyDB.set('nextLobby', 0);
    }
    console.log(`Loaded ${lobbyDB.size-1} squad indicators`);
    client.lobbyDB = lobbyDB;

    await playerDB.defer;
    console.log("Loaded player database");
    client.playerDB = playerDB;

    let logChannel = await client.channels.find(channel => channel.id === client.config.get('channelConfig').logChannel);
    logChannel.send(`<@198269661320577024> bot restarted`);

    //set default status
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

    console.log(`\n${client.config.get('identity').name} online`);
}