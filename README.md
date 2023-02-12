Speed Logger
============

Log network speed to a CSV routinely and display in a Dashboard.

### Web Interface auto update + history

![Web interface](https://i.snag.gy/nd8ERc.jpg)

### Console Graph

![Console graph](https://i.snag.gy/i7gObk.jpg)

## Install

Requires the speedtest-cli Python CLI tool: https://github.com/sivel/speedtest-cli

- Install Python speedtest-cli: `pip install speedtest-cli` or `easy_install speedtest-cli`
- Install required Node packages: `npm install`
- Run the app: `node speed.js`
- Check `speed_test.csv` after a few hours 
- If you run the webserver visit `http://127.0.0.1:3131`

## Options

Configure the options in the first few lines of the `speed.js` file.

```javascript
  root: '/path/to/speed-logger',      // Root path of project
  bin: '/path/to/.local/bin',         // Path to folder where `speedtest-cli` installed

  interval: 300,                      // Interval of test in seconds
  logger: true,                       // Save test results
  loggerFileName: 'speed_test.csv',   // Name of file to save history

  enableWebInterface: true,           // Web interface of result
  webInterfacePort: 3131,             // Port of web interface
  webInterfaceListenIp: "0.0.0.0",    // IP to start server

  enableCLICharts: false,             // Show graph in CLI
  clearCLIBetweenTest: false,         // Clear screen between test
  consoleLog: true,                   // Output logging to console

  secureDomains: null,                // Array of strings [ 'www.example.com' ]
  secureAdminEmail: 'me@example.com'  // The admin for the secure email confirmation
```

## Secure HTTP Connection

You can secure the http connection by creating a 
[Let's Encrypt](https://letsencrypt.org/) certificate as outlined below.

```sh
# 1) Install Let's Encrypt:
wget https://dl.eff.org/certbot-auto
chmod a+x certbot-auto

# 2) Create dns entry and add _acme-challenge as TXT with key value:
./certbot-auto certonly --agree-tos --renew-by-default --manual --preferred-challenges=dns -d www.example.com

# 3) Copy keys to certs:
cp /etc/letsencrypt/* ./certs/ -r

# 4) To renew key, if required:
./certbot-auto renew
```

You need to configure the `secureDomains` and `secureAdminEmail` once the above
has been configured.

## Service Daemon for Debian/Ubuntu

If you want to run this and log your results continuously there is a convienent
`systemd` boot script included in the repository called `speed-logger.service` 
which can be used on all Debian and Ubuntu OSes and any other OS that supports 
`systemd`.

To setup the service:

```
$ sudoedit /etc/systemd/system/speed-logger.service
```

Paste the contents of [speed-logger.service](speed-logger.service) and be sure 
to edit the following details:

```ini
# Change Environment NODE_VERSION to the version of Node installed on your machine.
Environment=NODE_VERSION=16.10
# Change User to the user who has read/write access to the speed-logger folder.
User=changeme
# Update the ExecStart with the full path to both `node` and where `speed.js` is.
ExecStart=/path/to/node /path/to/speed-logger/speed.js
```

Save your edited `/etc/systemd/system/speed-logger.service` file and enable and
start the service.

```console
$ sudo systemctl enable speed-logger.service
Created symlink /etc/systemd/system/multi-user.target.wants/speed-logger.service → /etc/systemd/system/speed-logger.service.
```

```console
$ sudo systemctl start speed-logger.service
```

## License

This version of the source code is licensed under an [MIT License](https://justinhartman.mit-license.org/).

> Copyright (c) 2023 Justin Hartman, https://justhart.com <code@justhart.com>

## Credits

- [@ericmann](https://github.com/ericmann/speed-logger) for the original code.
- [@justinhartman](https://github.com/justinhartman) for some of the improvements and systemd script.
