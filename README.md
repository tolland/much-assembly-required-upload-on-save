
# Mar File Uploader - README

This is a simple uploader extension for the Much Assembly Required game.
https://muchassemblyrequired.com/

It basically allows you to avoid using the web interface to upload;
![Much Assembly Required](https://i.imgur.com/30GJEQD.png)

## Features

The extension creates a command with a default keybings of Ctrl-Alt-U, which 
uploads the contents of the current editor to the account configured in 
settings.json

Alternatively can be used against mutiple arbitrary back-ends, for production,
development, local etc..

## Requirements

This extension obviously requires that the user has an account on 
muchassemblyrequired.com/ or a privately hosted server

## Extension Settings

### Simple configuration (for use with only muchassemblyrequired.com)

Only requires username/password for muchassemblyrequired.com in `settings.json`

```json
{
    "marserver.username": "XXX-username",
    "marserver.password": "XXX-password",
}
```
Pressing Ctrl-Alt-U will upload the current file in the editor to muchassemblyrequired.com

### Advanced config. When using multiple target servers

If you have a private server, or similar you can add blocks of servers

```json
    //create a bunch of alternatives
    "marserver.servers": [
        {
            "username": "tolland",
            "password": "XaeNge3ohsh4"
        },
        {
            "username": "a.n.other.user",
            "password": "secret.password",
            "url": "http://95.85.6.131/mar"
        },
        {
            "username": "myserverXYZ",
            "password": "my.pass",
            "url": "http://localhost/Much-Assembly-Required-Frontend"
        }
    ],
```

You can then use the following keybings to upload the active file

 * `Ctrl-Shift-Alt-1` - uploads the first server
 * `Ctrl-Shift-Alt-2` - the next one
 * `Ctrl-Shift-Alt-3`
 * `Ctrl-Shift-Alt-4`
 
 Using a keybinding probably throws an error if server doesn't exist in config

## Known Issues

This is a quickly written work-around. It's unlikely to be without bugs
make sure you have a backup of your files before uploading

## Release Notes

Users appreciate release notes as you update your extension.


### 0.1.0

Really a bare bones demo.


### For more information

* Slack
* Wiki

