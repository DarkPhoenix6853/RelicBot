//If something needs to know the permissions for this command, it looks here
exports.permissions = (client) => {
    return perms = {
        botChannel: true,           //If true, bot only responds in bot channels
        adminBotChannel: false,     //If true, bot only responds in admin bot channels
        role: client.config.get('perms').user     //Last word specifies permission level needed to use this command
    }
}

//This code is run when the command is executed
exports.run = (client, message, args) => {

    let lith = `Unvaulted Lith relics:
C6, D1, D2, K4, M5, M6, P3, S10`;

let meso = `Unvaulted Meso relics:
D5, E4, I1, K3, N9, N10, P2, P3`;

let neo = `Unvaulted Neo relics:
A3, I2, M3, N12, R4, T2, T3, Z5`;

let axi = `Unvaulted Axi relics:
A10, A11, B3, B4, C5, S7, T4, W1`;

    let text;
    switch (args[0]) {
        case "lith":
            text = lith;
            break;
        case "meso":
            text = meso;
            break;
        case "neo":
            text = neo;
            break;
        case "axi":
            text = axi;
            break;
        default:
            text = "Bad era";
    }

    message.channel.send(text);

};