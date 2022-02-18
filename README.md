# pokecord-hint-solver
Simple bot for guessing pokemon by name.

## Invitation
[Invite this bot to your server!](https://discord.com/api/oauth2/authorize?client_id=876704750480023584&permissions=3072&scope=bot)

## Usage
The bot will automatically respond to poketwo's messages that start with the hint message ("The pokémon is" by default)

Use `phz!help` to bring up a help menu.

## Commands

List of commands:

### Help
Responds with help message.

### Info
Posts User count, Server count, and source link.

### Invite
Sends the user a DM containing an invite link.

### Prefix
Shows and changes the bot's prefix. phz! is a global prefix and will always work.

### Catchfix
Shows and changes the catch command to prepend to hint solutions.

### Togglecatchfix
Enables or disables catch command prefixing to hint solutions.

### Togglehint
Enables hint solving, disables hint solving, and puts spoilers around hint resolutions.

### Solve
Solves a given hint.

Example: 

`phz!solve M_w`
returns
`Mew`
`Muk`

### List
Post all matching pokemon.

Example:

`phz!solve M__` 
returns
`Mew, Muk`


## Setup (hosting)

Runs Node.js 16.x

Requires discord.js , keyv, @keyv/sqlite

Copy config-template.json into config.json

Token: bot token.

Run:
```
node bot.js
```

## Contributing
This bot is meant to be simple and lightweight, and its single purpose is to guess pokemon names.

Contributions should be clean and clear in what they do.
