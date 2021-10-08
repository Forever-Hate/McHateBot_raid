try {
    const config = require(`${process.cwd()}/config.json`)  //讀取config(組態)
    const settings = require(`${process.cwd()}/settings.json`) //讀取設定檔案
    const tokens = require('prismarine-tokens-fixed');  //讀取prismarine-tokens-fixed(驗證緩存)模塊
    const mineflayer = require('mineflayer');  //讀取mineflayer模塊

    const sd = require('silly-datetime');
    const fs = require("fs"); //讀取silly-datetime模塊
    const time = sd.format(new Date(), 'YYYY-MM-DD HH-mm-ss'); //獲得系統時間

    let loginOpts = {  //登入資訊
        host: config.ip,  //伺服器ip
        port: config.port,  //伺服器port(預設25565)
        username: config.username,  //Minecraft帳號
        password: config.password,  //Minecraft密碼
        tokensLocation: './bot_tokens.json',  //驗證緩存檔案
        tokensDebug: true,  //取得的token是否除錯
        version: false,  //bot的Minecraft版本
        auth: config.auth //登入驗證器使用mojang或者microsoft
    }

    function connect() {
        tokens.use(loginOpts, function (_err, _opts) { //使用驗證緩存
            const bot = mineflayer.createBot(_opts) //定義bot為mineflayer類別中的createBot
            fs.mkdir('./logs', {recursive: true}, (err) => {
                if (err) throw err;
            });

            bot.once('spawn', () => {   //bot啟動時
                console.log(`【McHatebot】 載入完成`)
                //從小黑窗中發送訊息
               bot.on('chat',(username,message,translate,jsonMsg) =>{
                    let coloredText = "";
                    if(jsonMsg.json.extra === undefined)
                    {
                        return;
                    }

                    jsonMsg.json.extra.forEach((value)=>{
                        if(jsonMsg.toString().indexOf("展示了 物品") != -1)
                        {
                            //console.log(jsonMsg)
                            //coloredText = modifyJsonMsg(value)//展示文字
                            //console.log(coloredText)
                            return;
                        }
                        coloredText = coloredText + modifyJsonText(value)+coloredJsonText(value.color,value.text)
                    });
                    console.log(coloredText);
                })
                if(settings.attack)
                {
                    require('./commands/attack')(bot,settings)
                }
            });
            let mcData
            bot.once('inject_allowed', () => {
                mcData = require('minecraft-data')(bot.version)
            })
            const whitelist = (config.whitelist);
            bot.on("message", async function (jsonMsg) {
                if(jsonMsg.text !== '')
                {
                  if(jsonMsg.toString().startsWith("目標生命 : ❤❤❤❤❤❤❤❤❤❤") && !settings.health)
                  {
                    return
                  }
                  await console.log(modifyJsonMsg(jsonMsg)) //顯示私訊訊息在黑窗
                }
                if (jsonMsg.toString().startsWith(`[廢土伺服] :`) &&
                    jsonMsg.toString().toLowerCase().includes(`想要你傳送到 該玩家 的位置!`) ||
                    jsonMsg.toString().toLowerCase().includes(`想要傳送到 你 的位置`)) {
                    let msg = jsonMsg.toString().split(/ +/g);
                    let playerid = msg[2]
                    if (whitelist.includes(playerid)) {
                        bot.chat(`/tok`)
                    } else {
                        bot.chat(`/tno`)
                    }
                }
                if (jsonMsg.toString().startsWith(`[收到私訊`)) {  //偵測訊息開頭為"[收到私訊"
                    const msg = (jsonMsg.toString())
                    let dec = msg.split(/ +/g);
                    let lo = dec[2].split(`]`)
                    let playerid = dec.splice(lo.length)[0].split("]") //取得Minecraft ID
                    let args = msg.slice(10 + playerid[0].length).split(" ")  //取得指令內容
                    if (whitelist.includes(`${playerid[0]}`)) {
                        switch (args[0]) { //指令前綴
                            case "attack": //開始存綠
                                if(!settings.attack)
                                {
                                    bot.chat(`/m ${playerid[0]} 開始打怪`)
                                    await require('./commands/attack')(bot,settings)
                                }
                                else
                                {
                                    bot.chat(`/m ${playerid[0]} 已經開始打怪`)
                                }
                                break;
                            case "exp":  //查詢經驗值
                                let exp = Math.round(bot.experience.progress * 100);
                                let shulker_box_set_count = parseInt(bot.experience.points/825280)
                                let shulker_box_count = parseInt(bot.experience.points%825280/12895)
                                bot.chat(`/m ${playerid[0]} 等級: ${bot.experience.level} 總經驗值: ${bot.experience.points} 百分比: ${exp}%`);
                                bot.chat(`/m ${playerid[0]} 目前可兌換界伏盒${shulker_box_set_count}組又${shulker_box_count}個`);
                                break;
                            case "help": //取得指令幫助
                                bot.chat(`/m ${playerid[0]} attack 開始打怪`)
                                bot.chat(`/m ${playerid[0]} exp 查詢經驗`)
                                bot.chat(`/m ${playerid[0]} about 關於作者`)
                                bot.chat(`/m ${playerid[0]} version 取得bot當前版本`)
                                bot.chat(`/m ${playerid[0]} help 取得指令幫助`)
                                bot.chat(`/m ${playerid[0]} exit 關閉bot`)
                                break;
                            case "version":
                                bot.chat(`/m ${playerid[0]} 當前bot版本為:v1.0.0`)
                                break;
                            case "about":
                                bot.chat(`/m ${playerid[0]} bot:[McHateBot] 突襲機器人`)
                                bot.chat(`/m ${playerid[0]} 作者DC:I-love-minecraft#2437`)
                                bot.chat(`/m ${playerid[0]} 遊戲ID:Forever_Hate`)
                                bot.chat(`/m ${playerid[0]} 有任何問題或回饋歡迎私訊我`)
                                break;
                            case "stop":
                                break;
                            case "exit": //關閉bot
                                bot.chat(`/m ${playerid[0]} 正在關閉bot中...`)
                                console.log(`5秒後將關閉bot...`)
                                setTimeout(function () {
                                    process.exit()
                                }, 5000)
                                break
                        }
                    } else {
                        bot.chat(`/m ${playerid[0]} 您不在【McHatebot】指令白名單內`)
                    }
                }
            })
            bot.once('kicked', (reason) => {
                let time1 = sd.format(new Date(), 'YYYY-MM-DD HH-mm-ss'); //獲得系統時間
                console.log(`[資訊] 客戶端被伺服器踢出 @${time1}   \n造成的原因:${reason}`)
            });
            //斷線自動重連
            bot.once('end', () => {
                let time1 = sd.format(new Date(), 'YYYY-MM-DD HH-mm-ss'); //獲得系統時間
                console.log(`[資訊] 客戶端與伺服器斷線 ，5秒後將會自動重新連線...\n@${time1}`)
                setTimeout(function () {
                    connect();
                }, 5000)
            });
        })
    }

    connect();
} catch (err) {
    console.log(`McHateBot發生錯誤${err}`)
}



function modifyJsonText(value) //色碼轉換
{
    if(value.bold) //這不可以
    {
        //console.log("粗體")
        return "\x1b[1m"
    }
    else if(value.italic) //這不可以
    {
        //console.log("斜體")
        return "\x1b[3m"
    }
    else if(value.underlined) //這可以
    {
        //console.log("底線")
        return "\x1b[4m"
    }
    else if(value.strikethrough) //這不可以
    {
        //console.log("刪除")
        return "\x1b[9m"
    }
    else if(value.obfuscated) //無亂碼ansi
    {
        //console.log("亂碼")
        return ""
    }
    else
    {
        return ""
    }
}

function coloredJsonText(color,text) //色碼轉換
{
    if(color === undefined)  //如顏色未定義 顯示白色
    {
        return "\x1b[97m"+text+"\x1b[0m"
    }
    switch (color)
    {
        case "black": //黑
            return "\x1b[30m"+text+"\x1b[0m"
            break
        case "dark_blue": //深藍(藍
            return "\x1b[34m"+text+"\x1b[0m"
            break
        case "dark_green": //深綠(綠
            return "\x1b[32m"+text+"\x1b[0m"
            break
        case "dark_aqua": //深青(青
            return "\x1b[36m"+text+"\x1b[0m"
            break
        case "dark_red": //深紅(紅
            return "\x1b[31m"+text+"\x1b[0m"
            break
        case "dark_purple": //紫(品紅
            return "\x1b[35m"+text+"\x1b[0m"
            break
        case "gold":  //黃
            return "\x1b[33m"+text+"\x1b[0m"
            break
        case "gray":  //淺灰(白
            return "\x1b[37m"+text+"\x1b[0m"
            break
        case "dark_gray": //深灰(亮黑
            return "\x1b[90m"+text+"\x1b[0m"
            break
        case "blue":     //藍(亮藍
            return "\x1b[94m"+text+"\x1b[0m"
            break
        case "green":   //淺綠(亮綠
            return "\x1b[92m"+text+"\x1b[0m"
            break
        case "aqua":   //水藍(亮青
            return "\x1b[96m"+text+"\x1b[0m"
            break
        case "red":    //紅(亮紅
            return "\x1b[91m"+text+"\x1b[0m"
            break
        case "light_purple": //洋紅(亮品紅
            return "\x1b[95m"+text+"\x1b[0m"
            break
        case "yellow":  //黃(亮黃
            return "\x1b[93m"+text+"\x1b[0m"
            break
        case "white":  //白(亮白
            return "\x1b[97m"+text+"\x1b[0m"
            break
        default:
            return "錯誤色碼"
            break
    }
}
function coloredJsonMsg(text)
{
    if(text.includes("§0")) //黑
    {
        return text.replace("§0","\x1b[30m")
    }
    else if(text.includes("§1")) //深藍
    {
        return text.replace("§1","\x1b[34m")
    }
    else if(text.includes("§2")) //深綠
    {
        return text.replace("§2","\x1b[32m")
    }
    else if(text.includes("§3")) //青(湖藍
    {
        return text.replace("§3","\x1b[36m")
    }
    else if(text.includes("§4")) //深紅
    {
        return text.replace("§4","\x1b[31m")
    }
    else if(text.includes("§5")) //紫
    {
        return text.replace("§5","\x1b[35m")
    }
    else if(text.includes("§6")) //金
    {
        return text.replace("§6","\x1b[33m")
    }
    else if(text.includes("§7")) //淺灰
    {
        return text.replace("§7","\x1b[37m")
    }
    else if(text.includes("§8")) //深灰
    {
        return text.replace("§8","\x1b[90m")
    }
    else if(text.includes("§9")) //藍
    {
        return text.replace("§9","\x1b[94m")
    }
    else if(text.includes("§a")) //綠
    {
        return text.replace("§a","\x1b[92m")
    }
    else if(text.includes("§b")) //淺藍
    {
        return text.replace("§b","\x1b[96m")
    }
    else if(text.includes("§c")) //紅
    {
        return text.replace("§c","\x1b[90m")
    }
    else if(text.includes("§d")) //粉紅
    {
        return text.replace("§d","\x1b[95m")
    }
    else if(text.includes("§e")) //黃
    {
        return text.replace("§e","\x1b[93m")
    }
    else if(text.includes("§f")) //白
    {
        return text.replace("§f","\x1b[97m")
    }
    else if(text.includes("§r"))
    {
        return text.replace("§r","\x1b[0m")
    }

}
function modifyJsonMsg(JsonMsg)
{
    try
    {
        const text = JsonMsg.text;
        let part = text.split("§")
        let part2 = []
        part.forEach((value)=>{
            value = "§"+value
            part2.push(coloredJsonMsg(value))
        })
        let msg = part2.join("")+"\x1b[0m"
        return msg
    }
    catch (e)
    {
      console.log("錯誤:"+e)
    }


}