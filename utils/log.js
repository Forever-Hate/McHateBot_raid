module.exports = function (local,fs,sd,settings){
    fs.mkdir('./logs', {recursive: true}, (err) => {
        if (err) throw err;
    });
    if (settings.enable_exchange_logs)
    {
        fs.mkdir('./exchange_logs', {recursive: true}, (err) => {
            if (err) throw err;
        });
    }
    this.writeErrorLog =function (e){
            let time =  sd.format(new Date(), 'YYYY-MM-DD HH-mm-ss');
            fs.writeFileSync(`./logs/${time}.txt`,e.toString(), function (err) {
                if (err)
                    console.log(err);
            });
    }
    this.writeExchangeLog = function (playerid,name,times){
        let time =  sd.format(new Date(), 'YYYY/MM/DD HH:mm:ss');
        if(fs.existsSync(`./exchange_logs/logs.txt`))
        {
            fs.appendFileSync(`./exchange_logs/logs.txt`,`time: [${time}]，executor: [${playerid}]，exchanged item: [${name}]，exchange times:[${times}]`+"\r\n", function (err) {
                if (err)
                    console.log(err);
            })
        }
        else
        {
            fs.writeFileSync(`./exchange_logs/logs.txt`,`time: [${time}]，executor: [${playerid}]，exchanged item: [${name}]，exchange times:[${times}]`+"\r\n", function (err) {
                if (err)
                    console.log(err);
            });
        }

    }

    return this
}
