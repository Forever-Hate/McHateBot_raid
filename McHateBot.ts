import { Config,Setting } from "./models/files";
import * as dotenv from 'dotenv';
import setLocalization, { localizer } from "./utils/localization";
import setLogger,{ logger } from "./utils/logger";
import { DiscardItemer } from "./commands/main/discarditem";
import { RaidController } from "./commands/main/raid";
import { Announcer } from "./commands/publicity/announcement";
import { Informer } from "./commands/main/inform";
import { ExchangeController } from "./commands/main/Exchange";
import { ReplyController } from "./commands/main/reply";
import { DiscordManager } from "./commands/communicate/dc";
import { Tracker } from "./commands/main/tracker";
import login,{ bot } from "./commands/main/bot";
import setItemVersion from "./utils/util";

try{
    //載入環境變數
    dotenv.config()
    const config:Config = require(`${process.cwd()}/config.json`)  //讀取config檔案
    const settings:Setting = require(`${process.cwd()}/settings.json`) //讀取設定檔案
    const sd = require('silly-datetime');//讀取silly-datetime模塊
    setLogger(settings);
    setLocalization(config);
    const discord:DiscordManager = new DiscordManager(settings)
    const discard:DiscardItemer = new DiscardItemer(discord ,settings)
    const raid:RaidController = new RaidController(discord ,settings)
    const publicity:Announcer = new Announcer(settings)
    const Inquire:Informer = new Informer()
    const exchange:ExchangeController = new ExchangeController(discard, settings)
    const reply:ReplyController = new ReplyController(discord, settings)
    const tracker:Tracker = new Tracker(settings)
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });
    const inventoryViewer = require('mineflayer-web-inventory')

    function showWelcomeBanner()
    {
        (localizer.format("WELCOME_BANNER") as string[]).forEach((value,index)=>{
            logger.l(value);
        })
    }

    function connect(isReconnect = false) 
    {
        logger.i("進入connect，開機")
        const whitelist = (config.whitelist);
        const broadcast_regex = new RegExp(/\<(.*?) 的領地告示牌廣播\> (.*)/)
        const messge_regex = new RegExp(/\[(.*?) -> 您\] (.*)/)
        login(); //登入

        bot.once('spawn', async () => {   //bot啟動時
            logger.i(`${localizer.format("LOADING_DONE")}`);
            showWelcomeBanner();
            setItemVersion(bot);
            if(settings.enable_inventory_viewer)
            {
                logger.d("有開啟inventoryViewer")
                inventoryViewer(bot)
            }
            //從小黑窗中發送訊息
            rl.on('line', async function (line:any) 
            {
                bot.chat(line)
            })

            if (settings.enable_discord_bot) 
            {
                logger.d("有開啟discord bot")
                discord.login(bot)
            }

            if (settings.enable_attack) 
            {
                logger.d("有開啟打怪")
                if (settings.enable_discard) 
                {
                    logger.d("有開啟丟垃圾")
                    discard.discardItem(bot)
                }
                if (settings.enable_detect_interrupt) 
                {
                    logger.d("有開啟偵測突襲中斷")
                    raid.detectInterruption(bot)
                }
                if (settings.enable_track)
                {
                    logger.d("有開啟追蹤")
                    tracker.track(bot);    
                }
                raid.raid(bot)
            }
            if (settings.enable_trade_announcement) 
            {
                logger.d("有開啟宣傳")
                publicity.startAnnounce(bot)
            }
        });

        bot.on("message", async function (jsonMsg:any) {
            const health = new RegExp(/目標生命 \: ❤❤❤❤❤❤❤❤❤❤ \/ ([\S]+)/g); //清除目標生命
            if (!settings.health) {
                if (health.test(jsonMsg.toString())) {
                    return;
                } else {
                    console.log(`${jsonMsg.toAnsi()}`);
                }
            } else {
                console.log(`${jsonMsg.toAnsi()}`);
            }

            if (jsonMsg.toString().startsWith(`[系統] `)) {
                // if (jsonMsg.toString().toLowerCase().includes('讀取人物成功')) 
                // {
                //     if (isReconnect || settings.enable_reconnect_tp) 
                //     {
                //         logger.d('有設定公傳，開始傳送');
                //         bot.chat(`/warp ${settings.reconnect_tp_point}`);
                //     }
                //     if (!settings.reconnect_tp_point) {
                //         logger.d('未設定公傳，傳送失敗');
                //         return;
                //     }
                    
                // }
                if (jsonMsg.toString().toLowerCase().includes(`想要你傳送到 該玩家 的位置`) || jsonMsg.toString().toLowerCase().includes(`想要傳送到 你 的位置`)) 
                {
                    logger.d('偵測到傳送請求');
                    const msg = jsonMsg.toString().split(/ +/g);
                    const playerId = msg[1]
                    if (whitelist.includes(playerId)) 
                    {
                        logger.d('包含在白名單內，同意傳送');
                        bot.chat(`/tpaccept ${playerId}`)
                    } 
                    else 
                    {
                        logger.d('不包含在白名單內，拒絕傳送');
                        bot.chat(`/tpdeny ${playerId}`)
                    }
                }
            }

            if (messge_regex.test(jsonMsg.toString())) 
            {
                const msg = jsonMsg.toString()
                const match = messge_regex.exec(jsonMsg.toString())
                const playerId = match![1] //取得Minecraft ID
                const args = match![2].split(" ")  //取得指令內容
                if (whitelist.includes(`${playerId}`) || playerId === bot.username) {
                    switch (args[0]) { //指令前綴
                        case "cmd":
                            bot.chat(match![2].slice(4))
                            break
                        case "exp":  //查詢經驗值
                            Inquire.experience(bot, playerId)
                            break
                        case "exchange": //經驗交換物品
                            await exchange.exchange_item(bot, playerId, args)
                            break
                        case "stop": //停止交換物品
                            exchange.stopExchange(bot, playerId)
                            break
                        case "item": //查詢經驗能換多少物品
                            exchange.inquire(bot, playerId, args)
                            break
                        case "equip": //裝備整套裝備
                            raid.equipped(bot)
                            break
                        case "unequip": //脫下整套裝備
                            raid.unequipped(bot)
                            break
                        case "switch": //更換宣傳詞
                            publicity.switchAnnouncement(bot, playerId)
                            break
                        case "throw": //丟棄所有物品
                            await discard.discardAllItems(bot)
                            break
                        case "help": //取得指令幫助
                            Inquire.help(bot, playerId)
                            break
                        case "version": //查詢版本
                            Inquire.version(bot, playerId)
                            break
                        case "about":  //關於此bot
                            Inquire.about(bot, playerId)
                            break
                        case "currentlog": //取得當前拾取紀錄log
                            if(settings.enable_track)
                            {
                                logger.d("有開啟追蹤")
                                tracker.getCurrentTrackLog(bot,playerId, args);
                            }
                            else
                            {
                                logger.d("沒有開啟追蹤")
                                bot.chat(`/m ${playerId} ${localizer.format("TRACK_COMMAND_ERROR")}`)
                            }
                            break;
                        case "fulllog": //取得所有拾取紀錄log
                            if(settings.enable_track)
                            {
                                logger.d("有開啟追蹤")
                                tracker.getFullTrackLog(bot,playerId);
                            }
                            else
                            {
                                logger.d("沒有開啟追蹤")
                                bot.chat(`/m ${playerId} ${localizer.format("TRACK_COMMAND_ERROR")}`)
                            }
                            break;
                        case "exit": //關閉bot
                            bot.chat(`/m ${playerId} ${localizer.format("SHUTDOWN")}`)
                            console.log(`Shutdown in 10 seconds`)
                            setTimeout(function () {
                                process.exit()
                            }, 10000)
                            break
                        default: {
                            reply.whitelistedReply(bot, playerId, msg)
                        }
                    }
                } else {
                    reply.noWhitelistedReply(bot, playerId, msg)

                }
            }

            if (broadcast_regex.test(jsonMsg.toString()) && settings.enable_detect_broadcast) 
            {
                logger.d("偵測到領地宣傳")
                const match = broadcast_regex.exec(jsonMsg.toString())
                const playerId = match![1] //取得Minecraft ID
                const args = match![2] //取得指令內容
                if (whitelist.includes(playerId)) 
                {
                    logger.d("玩家ID有包含在白名單內")
                    if (settings.enable_discord_bot) 
                    {
                        logger.d("有開啟discord bot，轉傳領地宣傳訊息")
                        discord.send(localizer.format("DETECT_BROADCAST_MSG_PREFIX") as string, args)
                    }
                    if(settings.enable_reply_msg)
                    {
                        logger.d("有開啟回覆訊息")
                        bot.chat(`/m ${settings.forward_ID} ${localizer.format("DETECT_BROADCAST_MSG_PREFIX")}: ${args}`)
                    }
                }
            }
        })

        bot.once('kicked', (reason:any) => {
            let time1 = sd.format(new Date(), 'YYYY/MM/DD HH:mm:ss'); //獲得系統時間
            logger.l(`[資訊] 客戶端被伺服器踢出 @${time1}   \n造成的原因:${reason}`)
        });
        //斷線自動重連
        bot.once('end', () => {
            let time1 = sd.format(new Date(), 'YYYY-MM-DD HH-mm-ss'); //獲得系統時間
            logger.l(`[資訊] 客戶端與伺服器斷線 ，10秒後將會自動重新連線...\n@${time1}`)
            if (settings.enable_trade_announcement) 
            {
                publicity.stopAnnounceInterval();
            }
            if (settings.enable_discard) 
            {
                discard.stopDiscardItemInterval();
            }
            if (settings.enable_attack) 
            {
                raid.raidDown()
            }
            if (readline) 
            {
                logger.i("取消監聽console line 事件")
                rl.removeAllListeners('line');
            }
            if (settings.enable_track)
            {
                tracker.trackDown(bot)
            }
            exchange.errorStop()
            setTimeout(function () {
                connect(true);
            }, 10000)
        });

        bot.once('error', (reason:any) => {
            logger.e(reason)
            logger.writeErrorLog(reason)
        })
    }

    connect();
} catch (err:any) {
    console.error(err)
    console.log('process exit in 10 sec...')
    new Promise(resolve => setTimeout(async () => {
        logger.writeErrorLog(err)
        process.exit()
    }, 10000))

}









