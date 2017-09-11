'use strict';

const Socket = require('socket.io');
const http = require('http');
const redis = require('redis');
const statsFrontend = require('../stats-frontend');

/**
 *
 * @param {object} config
 * @return {object}
 */
function monitor(config = {}) {
    if (!config.hasOwnProperty('monitor') || !config.monitor.hasOwnProperty('enabled') || !config.monitor.enabled) {
        throw new Error('Monitor is not enabled!');
    }
    if (!config.monitor.hasOwnProperty('port') || !config.monitor.hasOwnProperty('host')) {
        throw new Error('HTTP port and host parameters are required!');
    }
    return {

        /**
         *
         * @param {function} cb
         */
        listen(cb) {

            /**
             * Socket.io setup
             */
            const io = new Socket();

            /**
             * HTTP setup
             */
            const server = http.createServer((request, response) => {
                response.writeHead(200, {"Content-Type": "text/html"});
                response.end();
            });
            io.attach(server);
            server.listen(config.monitor.port, config.monitor.host, () => {
                /**
                 * Run stats
                 */
                const stats = statsFrontend(config);
                stats.run();

                /**
                 * Subscribe to 'stats' events and broadcast data to all Websocket clients
                 */
                const client = redis.createClient(config.redis.port, config.redis.host);
                client.on('ready', () => {
                    client.subscribe('stats');
                });
                client.on('message', (channel, message) => {
                    const json = JSON.parse(message);
                    io.emit('stats', json);
                });
                cb();
            });
        },
    };
}

module.exports = monitor;
