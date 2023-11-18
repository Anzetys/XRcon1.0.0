# XRcon1.0.0
Rcon bot for discord to ASA or ASE, listens to the discord channel on the config.json.

once a command its sent it creates 1 button per server from the Config.json.
Each server name will be displayed with an emoji or any utf-8 character. https://www.textfacescopy.com/confused-text-faces.html
You can change the buttons colors using any of this formats: 
Name	  	Color
```
Primary		blurple
Secondary    grey
Success		green
Danger		red
```
```
  "servers": {
    "(ノ˵ ͡• ͜ʖ ͡•˵)ﾉ♡*": { // Can Be emoji Utf-8 format or https://www.textfacescopy.com/confused-text-faces.html
      "name": "server_name",
      "ip": "rcon_ip",
      "port": "rcon_port",
      "password": "rcon_password",
      "style": "primary"
    }
```



<img width="477" alt="b29666c53c420be8dfa26f6781fdecfb" src="https://github.com/Anzetys/XRcon1.0.0/assets/150568341/f6eea0cc-856d-46d6-9eaa-5cb88e0ccc19">







How to set up enviroment to run the source

Open CMD from the folder where you have the config.json and XRcon.js

RUN:

npm init -y

npm install discord.js

npm install minecraft-rcon-client

Run the bot:

node XRcon.js
