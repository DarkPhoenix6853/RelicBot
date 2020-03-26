# WispBot
Relic-tagging bot for Relic Burners


## Current Commands/features
Admin-level commands:
* CreateRelic
    * Adds a new relic/list of relics to the database (for if a new one is vaulted)
    * Only allows relics with an era (lith/meso/neo/axi), an optional space, a single letter, and then any amount of numbers. 
    * Doesn't break if no good relics are given
* DeleteRelic
    * Deletes a relic/list of relics and their associated user subscriptions from the database (for if someone screwed up and added a relic that they shouldn't have)
    * Can only delete relics that are already in the database
    * Doesn't break if told to delete a relic that doesn't exist
* RelicUsers
    * Shows a list of users that are subscribed to a relic/list of relics (Probably not very useful)
    * Doesn't ping anyone, just posts their names
    * Doesn't break if no relics are given/bad relics are given
* Kill
    * Shuts the bot down
    * Has to be restarted by the bot host (can't be done through Discord)
    * Only for if it somehow starts breaking in some way that hurts the server/users

User-level commands (Bot channel):
* AddRelic
    * Subscribes a user to a relic/list of relics so that people hosting it can ping them
    * Only adds relics that exist in the database that the user doesn't already have
    * Doesn't break if no good relics are provided
* RemoveRelic
    * Unsubscribes a user from a relic/list of relics
    * Doesn't break if asked to remove a relic that doesn't exist/the user doesn't have, just does nothing
* MyRelics
    * Shows a list of the relics a user is subscribed to
    * Formatted into tiers
* ListRelics
    * Shows a list of relics that can be subscribed to
    * Formatted into tiers
* Help
    * Provides a list of available commands, or shows a how-to for a specific command
* Squad
    * Lists people in a given squad
    * Doesn't ping anyone - just displays names
    * Lists full squads
    * Does not list closed squads
* MySquads - Lists the squads you are waiting on
    * Sections for "Subbed squads", "Hosted squads" and "Full squads" 

User-level commands (Recruiting channel):
* Create
    * Creates a hosting message, automatically detects vaulted relics and pings everyone subscribed to one of those relics
    * Pings everyone ONCE, even if they are subscribed to multiple relics in the list
    * Underlines relic names that are recognised
        * pings people for these relics, IF anyone is subscribed to that relic to begin with
        * (Temporary) if a role exists for that relic, also pings that
    * Creates squad identifiers for player counts (1/4, 2/4, 3/4)
* Join
    * Lets a user join squads
    * Can join multiple squads at once
    * If squad is filled, pings everyone in that squad
* Leave
    * Lets a user leave squads
    * Can leave multiple at once
    * Can use 'all' instead of a list of squad ID's
    * Only leaves squads that are still open (Closed squads cannot send notifications)
* Close (host only) 
    * Prevents more users from joining the squad, does not notify anyone
    * Can use 'all' instead of a list of squad ID's
    * Replaces squad player count with "X" in the host message
    * Cannot close full lobbies (These will no longer be open anyway)
* AddPlayer (host only)
    * Adds one to the number of players in the squad
        * Used if you find someone in Warframe's recruiting chat/have a friend join outside of the Discord server
    * If this will fill squad, require an extra -o argument (see help message)
* RemovePlayer (host only)
    * Removes one nameless player from the squad
    * NOT for kicking people out - just for removing people you've added with "AddPlayer"
    * Cannot go below the number of people who have used "join" + the host

Dev-level commands (Unique to this server):
* ImportRelics
    * Imports all relics in "relics.json" into the database. Should only need to use this once ever unless you use the next one...
* PurgeDB
    * Wipes everything. Not meant to be used lightly. Probably requires you to use ImportRelics afterwards, unless you really like typing. 


All functions that detect the names of relics will work with any capitalisation/lack of spaces 
as long as the relics have an era (Lith/Meso etc.) followed by a single letter and then at least one (but maybe more) number/s

### Additional Features
* When a user leaves the server, their relic subscriptions are wiped to limit future useless pings

## To Be Completed

### Possible expansion:
#### Small
* Add clickable links to squad filled messages to go see the squad
* Test out for ping system - Create temp role, add everyone to it, ping the role, delete the role
* Make +!create append a 1/4 squad if none found
* Add a command just to ping relics rather than create new squads

##### Aliases
* Add +!c alias for create
* Also +!host and +!h
* +!j or +!y for join

#### Medium
* Serious amounts of refactoring
    * Especially splitting out functions into librariess
* Timed deletion of squads somehow
* Use some kind of API to post fissure updates (Guthix's idea)
    * https://api.warframestat.us/pc/fissures
* Limit pings based on current fissures? - Talk to Guthix and other admins about what they want

#### Insane
* Mass ping using global list (Stops host messages from competing with each other)
    * automatically starts pinging when new users are added
    * new players to ping are just added to the list
    * New bot just for pinging?
        * Avoids competition
        * Alleviates rate limit
        * Use HTTP POST to communicate?
* Automatically make/delete a certain number of roles for most popular relics?
    * Less spam-pinging, requires X number of spare roles. Very far in the future. 
    * Only change roles if there is a significant imbalance
    * While new role is being populated, still mass-ping users instead of using it

