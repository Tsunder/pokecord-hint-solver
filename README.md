# pokecord-hint-solver
solves hint messages

## Invitation
[Invite this bot to your server!](https://discord.com/api/oauth2/authorize?client_id=876704750480023584&permissions=3072&scope=bot)

## Usage
The bot will automatically respond to poketwo's messages that start with the hint message ("The pokémon is" by default)

Use phz!help to bring up a help menu.

### Commands

List of commands:

#### Help
Responds with help message.

#### Invite
Posts invite link.

#### solve
Solves a given hint.

#### list
Posts all matching pokemon for a giving hint.

#### catchfix
Shows and changes the catch command to prepend to hint solutions.

#### prefix
Shows and changes the bot's prefix. phz! is a global prefix and will always work.

#### togglecatchfix
Enables or disables catch command prefixing to hint solutions.

#### togglehint
Enables or disables hint solving.

## Setup (hosting)

Runs Node.js 16.x

Requires discord.js , keyv, @keyv/sqlite

Copy config-template.json into config.json

Token: bot token.


## Contributing
This bot is meant to be simple and lightweight.
