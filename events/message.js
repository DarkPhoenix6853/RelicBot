module.exports = (client, message) => {
    const eventFunc = client.eventFuncs.get("message");

    //ignore bots
    if (message.author.bot && message.author.id != client.user.id) {
        let channelID = message.channel.id;
        if (client.config.get('channelConfig').recruitChannel == channelID) {
            message.delete();
        }
        return;
    }

    eventFunc.onMessage(client, message);

    //-----Command Handling-----
    //if the message has the right prefix, see if it's a command
    if (message.content.indexOf(client.config.get('baseConfig').prefix) === 0 || message.content.indexOf("+!") === 0) {
        eventFunc.commandHandler(client, message);
    } else if (message.channel.id == client.config.get('channelConfig').recruitChannel && message.author.id != client.user.id) {
        message.delete();
    }
    
    
};