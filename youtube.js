registerPlugin({
    name: 'Youtube Webinterface!',
    version: '1.0',
    description: 'Youtube Webinterface for playing and downloading YouTube Tracks.',
    author: ' MaxS <max@schmitt.ovh> & irgendwer <Jonas@sandstorm-projects.de>',
    vars: {
        ytkey: {
            title: 'Youtube API Key (see the tutorial for instructions)',
            type: 'string'
        },
        play: {
            title: 'Support notification type', 
            type: 'select', 
            options: ['on','off']
        },
        dl: {
            title: 'Support notification type',
            type: 'select',
            options: ['on','off']
        },
        enq: {
            title: 'Support notification type',
            type: 'select',
            options: ['on','off']
        }
    },
    enableWeb: true
}, function(sinusbot,config, info){
sinusbot.log("YTWeb Webinterface Ready");
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
        qyt(ev.data);
        sinusbot.log('YTWeb Triggered with "enque" at '+ ev.data);    
        return 'The Video will be sucessfully enqueued now.';
        } else {
            sinusbot.log('YTWeb tried to play '+ ev.data + ' but it was deactivated.'); 
            return 'Enqueuing is not enabled.';
        }
        
});
    sinusbot.on('api:dl', function(ev) {
        if (config.play != 1) {
        sinusbot.log('YTWeb Triggered with "downloaded" at '+ ev.data); 
        sinusbot.ytdl(ev.data); 
        return 'The Video will be sucessfully downloaded now.';
        } else {
            sinusbot.log('YTWeb tried to play '+ ev.data + ' but it was deactivated.'); 
            return 'Downloading is not enabled.';
        }
        
});
    sinusbot.on('api:ytkey', function(ev) {
        return config.ytkey;
        
});    
});
