
# Mar File Uploader - README

This is a simple uploader extension for the Much Assembly Required game.
https://muchassemblyrequired.com/

It basically allows you to avoid using the web interface to upload;

![Much Assembly Required](https://i.imgur.com/wlGOKxW.png?1)

Instead save the document then press `Ctrl-Alt-U`

![Much Assembly Required](https://i.imgur.com/bx4wTnf.png)

or 

* `Ctrl-Shift-Alt-1` 
* `Ctrl-Shift-Alt-2` 
* `Ctrl-Shift-Alt-3`
* `Ctrl-Shift-Alt-4`

to upload to multiple servers.

## Features

The extension creates a command with a default keybindings of Ctrl-Alt-U, which 
uploads the contents of the current editor to the account configured in 
settings.json

Alternatively it can be used against multiple arbitrary back-ends, for production,
development, local etc..

Once uploaded the changes will be in immediate effect, but, to view them in the online editor the reload button needs to be clicked

## Requirements

This extension obviously requires that the user has an account on 
muchassemblyrequired.com/ or a privately hosted server.

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

### For use with local development
You can additionally include the local server url to hit:
```json
{
    "marserver.url": "http://localhost:4567"
}
```

#### Configure Upload-on-save

add the following to your `settings.json` to automatically upload-on-save any file matching the glob.

```json
    "marserver.onsave": true,
    "marserver.commands": {
        "marserver.uploadToServer": [
            "**/*.mar"
        ]
    }

```

### Advanced config. When using multiple target servers

If you have a private server, or similar you can add blocks of servers

```json
    //create a bunch of alternatives
    "marserver.servers": [
        {
          // default user for muchassemblyrequired
            "username": "<USER1>",
            "password": "<PASS2>"
        },
        {
          // other servers. localhost maybe??
            "username": "<USER2>",
            "password": "<PASS2>",
            "url": "http://localhost/Much-Assembly-Required-Frontend"
        },
        {
          // A dev server
            "username": "<USER3>",
            "password": "<PASS3>",
            "url": "http://95.85.6.131/mar"
        }
    ],
```

You can then use the following keybindings to upload the active file

* `Ctrl-Shift-Alt-1` - uploads the first server
* `Ctrl-Shift-Alt-2` - the next one
* `Ctrl-Shift-Alt-3`
* `Ctrl-Shift-Alt-4`
 
 Using a keybinding probably throws an error if server doesn't exist in config

 ### auto-upload on save for multiple servers

If you have configured an array of marservers, you can up the active file to all of them, on saving the active document.

You can have up to 4 (corresponding to keybindings Ctrl-Shift-Alt-[1-4])

 ```json
,
    "marserver.onsave": true,
    "marserver.commands": {
        "marserver.uploadToServer1": [
            "**/*.mar"
        ],
        "marserver.uploadToServer2": [
            "**/*.mar"
        ],
        "marserver.uploadToServer3": [
            "**/*.mar"
        ],
        "marserver.uploadToServer4": [
            "**/*.mar"
        ]
    }
 ```

## Known Issues

This is a quickly written work-around. It's unlikely to be without bugs
make sure you have a backup of your files before uploading.

Please raise any issues at https://github.com/tolland/much-assembly-required-upload-on-save/issues

### For more information

* [Slack](https://muchassemblyrequired.slack.com)
* [Wiki](https://github.com/simon987/Much-Assembly-Required/wiki)

