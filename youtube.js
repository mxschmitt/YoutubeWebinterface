registerPlugin({
    name: 'Youtube Webinterface!',
    version: '1.4',
    description: 'Youtube Webinterface for playing and downloading YouTube Tracks.',
    author: 'maxibanki <max@schmitt.ovh> & irgendwer <Jonas@sandstorm-projects.de>',
    vars: {
        apikey: {
            title: 'Youtube API Key (see the tutorial for instructions)',
            type: 'string'
        },
        play: {
            title: 'enable playing', 
            type: 'select', 
            options: ['on','off']
        },
        dl: {
            title: 'enable downloading',
            type: 'select',
            options: ['on','off']
        },
        enq: {
            title: 'enable enqueuing',
            type: 'select',
            options: ['on','off']
        }
    },
    enableWeb: true
}, function(sinusbot, config, info) {
    sinusbot.log("YTWeb Webinterface Ready");

    if (typeof config.apikey != 'undefined') {
        sinusbot.setVar("ytapikey", config.apikey);
    }
    
    sinusbot.on('api:ytplay', function(ev) {
        if (config.play != 1) {
            sinusbot.yt(ev.data);
            sinusbot.log('YTWeb Triggered with "played" at '+ ev.data);    
            return 'The Video will be sucessfully played now.';
        } else {
            sinusbot.log('YTWeb tried to play '+ ev.data + ' but it was deactivated.'); 
            return 'Playing is not enabled.';            
        }    
    });
    
    sinusbot.on('api:ytenq', function(ev) {
        if (config.enq != 1) {
            sinusbot.qyt(ev.data);
            sinusbot.log('YTWeb Triggered with "enque" at '+ ev.data);    
            return 'The Video will be sucessfully enqueued now.';
        } else {
            sinusbot.log('YTWeb tried to play '+ ev.data + ' but it was deactivated.'); 
            return 'Enqueuing is not enabled.';
        }
    });

    sinusbot.on('api:ytdl', function(ev) {
        if (config.dl != 1) {
            sinusbot.log('YTWeb Triggered with "downloaded" at '+ ev.data);
            sinusbot.ytdl(ev.data);
            return 'The Video will be sucessfully downloaded now.';
        } else {
            sinusbot.log('YTWeb tried to download '+ ev.data + ' but it was deactivated.');
            return 'Downloading is not enabled.';
        }
    });

    sinusbot.on('api:ytwebconfig', function(ev) {
        var ytwebconfig = {};
        ytwebconfig.play = (config.play != 1);
        ytwebconfig.enqueue = (config.enq != 1);
        ytwebconfig.download = (config.dl != 1);
        ytwebconfig.ytapikey = sinusbot.getVar("ytapikey");
        return ytwebconfig;
    });
});