/**
 * Configuration options.
 */
let options = {
    root: '/home/odroid/speed-logger',  // Root path of project
    bin: '/home/odroid/.local/bin',     // Path to local bin folder
    interval: 300,                      // Interval of test in second
    logger: true,                       // Save test results
    loggerFileName: 'speed_test.csv',   // Name of file to save history
    enableWebInterface: true,           // Web interface of result
    webInterfacePort: 3131,             // Port of web interface
    webInterfaceListenIp: "0.0.0.0",    // IP to start server
    enableCLICharts: false,             // Show graph in CLI
    clearCLIBetweenTest: false,         // Clear screen between test
    consoleLog: true,                   // Output logging to console
    /**
     * secureDomains uses https://letsencrypt.org/
     * 1) Install Let's Encrypt:
     * wget https://dl.eff.org/certbot-auto
     * chmod a+x certbot-auto
     * 2) Create dns entry and add _acme-challenge as TXT with key value:
     * ./certbot-auto certonly --agree-tos --renew-by-default --manual --preferred-challenges=dns -d www.example.com
     * 3) Copy keys to certs:
     * cp /etc/letsencrypt/* ./certs/ -r
     * 4) To renew key, if required:
     * ./certbot-auto renew
     */
    secureDomains: null,                // Array of strings [ 'www.example.com' ]
    secureAdminEmail: 'me@justhart.com' // The admin for the secure email confirmation
};

/**
 * Import modules.
 */
let fs = require('fs'),
    child = require('child_process'),
    path = require('path'),
    logger = fs.createWriteStream(path.join(options.root, `/${options.loggerFileName}`), {'flags': 'a'}),
    asciiChart = require('asciichart'),
    http = require('http'),
    https = require('https'),
    csv = require('fast-csv'),
    date = require(path.join(options.root, '/libs/date')),
    formatBytes = require(path.join(options.root, '/libs/formatBytes'));

/**
 * First, checks if it isn't implemented yet.
 */
if (!String.prototype.format) {
    String.prototype.format = function () {
        let args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}

/**
 * Check if web interface is enabled.
 */
if (options.enableWebInterface) {
    // Log to console.
    if (options.consoleLog)
        console.log(
            'Start {0}webserver on {1}:{2} every {3} minutes refresh'.format(options.secureDomains && options.secureAdminEmail ? 'secure' : '',
                options.webInterfaceListenIp,
                options.webInterfacePort,
                Math.round(options.interval / 60))
        );

    let server;

    // Bootstrap webserver.
    if (options.secureDomains && options.secureAdminEmail) {
        const PROD = true;
        let Greenlock = require('greenlock');
        // Greenlock configuration.
        let greenlockCfg = {
            agreeTos: true,                        // Accept Let's Encrypt v2 Agreement
            email: options.secureAdminEmail,       // IMPORTANT: Change email and domains
            approveDomains: options.secureDomains, // Approve domains
            communityMember: false,                // Submit stats to help make Greenlock better.
            version: 'draft-11',
            server: PROD ? 'https://acme-v02.api.letsencrypt.org/directory'
                : 'https://acme-staging-v02.api.letsencrypt.org/directory',
            configDir: path.join(options.root, '/certs'),
            challengeType: 'dns-01'
        };

        // Create greenlock instance.
        let greenlockCreate = Greenlock.create(greenlockCfg);

        // Log to console.
        if (options.consoleLog) {
            console.log('Make sure you have the certificates in: {0}'.format(greenlockCfg.configDir));
        }

        // Secure https webserver.
        server = https.createServer(greenlockCreate.tlsOptions,
            function (req, res) {
                fs.readFile(path.join(options.root, '/index.html'), 'utf-8', function (error, content) {
                    res.writeHead(200, {"Content-Type": "text/html"});
                    res.end(content);
                })
            }
        );
    } else {
        // Normal http webserver.
        server = http.createServer(function (req, res) {
            fs.readFile(path.join(options.root, '/index.html'), 'utf-8', function (error, content) {
                res.writeHead(200, {"Content-Type": "text/html"});
                res.end(content);
            });
        });
    }

    // Initialise Socket.io and listen on the server.
    var io = require('socket.io').listen(server);
    server.listen(options.webInterfacePort, options.webInterfaceListenIp);

    // When a client connects, we push the data to the history.
    io.sockets.on('connection', function (socket) {
        // Read CSV to show history.
        let stream = fs.createReadStream(path.join(options.root, `/${options.loggerFileName}`))
        let pings = [], downloads = [], uploads = [];
        let csvStream = csv()
            .on("data", function (data) {
                pings.push([(new Date(data[0])).getTime(), parseFloat(data[2])]);
                downloads.push([(new Date(data[0])).getTime(), parseFloat(data[3])]);
                uploads.push([(new Date(data[0])).getTime(), parseFloat(data[4])]);
            });

        // Pipe the CSV to the stream.
        stream.pipe(csvStream);


        // Make the series for Highcharts.
        let series = [
            {
                name: 'Pings',
                data: pings,
                yAxis: 2
            },
            {
                name: 'Downloads',
                data: downloads
            },
            {
                name: 'Upload',
                data: uploads,
                yAxis: 1
            }
        ];

        // When the stream has ended, emit the history.
        csvStream.on("end", function () {
            socket.emit('history', series);
        });
    });
}

/**
 * Check if CLI charts are enabled.
 */
if (options.enableCLICharts) {
    // This is series for CLI chart
    let s0 = [], s1 = [], s2 = [], id = 0, format = function (x) {
        return ('          ' + x.toFixed(0)).slice(-10);
    };
}

/**
 * Run the speed test, log to file and update charts.
 */
function log_speed() {
    if (options.consoleLog)
        console.log("\nRunning test ...");

    // Run speedtest-cli.
    let speedTest = child.exec(path.join(options.bin, '/speedtest-cli --json'));
    speedTest.stdout.on('data', function (data) {
        try {
            let out = JSON.parse(data);
            let pertinentData = [];
            pertinentData[0] = date('Y-m-d H:i:s');
            pertinentData[1] = out.client.ip;
            pertinentData[2] = out.ping;
            pertinentData[3] = out.download;
            pertinentData[4] = out.upload;
            pertinentData[5] = out.server.sponsor;

            if (options.clearCLIBetweenTest && options.enableCLICharts)
                console.log('\033c');

            // Output result to console.
            if (options.consoleLog)
                console.log(
                    '{0} => IP: {1} | Ping: {2}ms | Download: {3} | Upload: {4} | Server: {5}'.format(pertinentData[0],
                        pertinentData[1],
                        pertinentData[2],
                        formatBytes(pertinentData[3]),
                        formatBytes(pertinentData[4]),
                        pertinentData[5])
                );

            // Update the web interface charts.
            if (options.enableWebInterface) {
                let tt = (new Date(pertinentData[0])).getTime();
                io.sockets.emit('update', [[tt, pertinentData[2]], [tt, pertinentData[3]], [tt, pertinentData[4]]]);
            }

            // ASCII chart.
            if (options.enableCLICharts) {
                s0[id] = (pertinentData[2]);
                s1[id] = (formatBytes(pertinentData[3], 0, true));
                s2[id] = (formatBytes(pertinentData[4], 0, true));
                id++;
                if (id == 100)
                    id = 0;

                // Only of one value is in the chart.
                if (s0.length > 1) {
                    console.log('PING');
                    console.log(asciiChart.plot(s0, {height: 10}));
                    console.log("\nDownload");
                    console.log(asciiChart.plot(s1, {height: 10, format: format}));
                    console.log("\nUpload");
                    console.log(asciiChart.plot(s2, {height: 10, format: format}));
                }
            }

            // Log to csv file.
            if (options.logger) {
                logger.write(pertinentData.join(','));
                logger.write('\r\n');
            }

        } catch (ex) {
            console.error('Error parsing data from speedtest.net: ' + data);
            console.error(ex)
        }

    });

    // If speedtest-cli is complete, kill the process and run the test again.
    speedTest.on('close', function (data) {
        speedTest.kill();
        setTimeout(log_speed, options.interval * 1000); // Run the test again
    });
}

/**
 * Start the speed test.
 */
log_speed();
