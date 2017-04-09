const consulLib = require('consul');
const os = require('os');
const dns = require('dns');

function ConsulPlugin(consulHost, bindPort) {
    console.log('ConsulPlugin', consulHost);
    this.started = false;
    this.consul = consulLib({host: consulHost});
    this.bindPort = parseInt(bindPort);
}


ConsulPlugin.prototype.apply = function(compiler) {
    compiler.plugin('done', () => {
        if (this.started){
            return
        }
        this.started = true;

        dns.lookup(os.hostname(), (err, address) => {
            if (err){
                return console.error("Can't resolve address", err);
            }
            console.log('addr: '+ address);
            
            let options = {
                name: 'sf_client',
                address: address,
                port: this.bindPort,
                id: 'sf_client-' + address,
                // check: {
                //     http: 'http://' + address + ':' + PORT + '/api/v1/health',
                //     interval: '1s'
                // }
            };

            this.consul.agent.service.register(options,  (err) => {
                if (err){
                    return console.error("Can't register consul client", err);
                }
                console.log('registration done');

                process.on('SIGTERM', () => {
                    console.log('deregistering');
                    this.consul.agent.service.deregister('sf_client-' + address, function () {
                        console.log('deregistered');
                    });
                });
            });

        });
    });
};

module.exports = ConsulPlugin;
