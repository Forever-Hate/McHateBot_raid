import * as dotenv from 'dotenv';
import setLocalization, { localizer } from "./utils/localization";
import setLogger,{ logger } from "./utils/logger";
import setDiscardItemer, { discardItemer } from "./commands/main/discarditem";
import setRaid, { raid } from "./commands/main/raid";
import setAnnouncer, { announcer } from "./commands/publicity/announcement";
import setInformer, { informer } from "./commands/main/inform";
import setExchangeManager, { exchangeManager } from "./commands/main/Exchange";
import setReplyManager, { replyManager } from "./commands/main/reply";
import setDiscordManager, { discordManager } from "./commands/communicate/dc";
import setTracker, { tracker } from "./commands/main/tracker";
import login,{ bot,setIsOnline} from "./commands/main/bot";
import setItemVersion, { config, getConfig, getSettings, settings } from "./utils/util";
import setFinancer, { financer } from "./commands/main/finance";
import { Route, WebSocketClient , websocketClient } from "./commands/websocket/websocket"
import { ChatMessage } from 'prismarine-chat';
import * as mineflayer from 'mineflayer';
var tpsPlugin = require('mineflayer-tps')(mineflayer);

try{
    //載入環境變數
    dotenv.config()
    const sd = require('silly-datetime');//讀取silly-datetime模塊
    getConfig();
    getSettings();
    setLogger();
    setLocalization();
    setDiscordManager();
    setDiscardItemer();
    setRaid();
    setAnnouncer();
    setInformer();
    setExchangeManager();
    setReplyManager()
    setTracker();
    setFinancer();
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });
    
    WebSocketClient.init();
    websocketClient!.refreshData()
    /**
     * 顯示歡迎旗幟在console
     */
    function showWelcomeBanner()
    {
        (localizer.format("WELCOME_BANNER",new Map().set("version",process.env.VERSION!)) as string[]).forEach((value,index)=>{
            logger.l(value);
        })
    }

    function connect() 
    {
        logger.i("進入connect，開機")
        const whitelist:string[] = config.whitelist;
        const broadcast_regex = new RegExp(/\<(.*?) 的領地告示牌廣播\> (.*)/)
        const messge_regex = new RegExp(/\[(.*?) -> 您\] (.*)/)
        login(); //登入
        bot.loadPlugin(tpsPlugin); //載入tps插件
        bot.once('spawn', async () => {   //bot啟動時
            logger.i(`${localizer.format("LOADING_DONE")}`);
            showWelcomeBanner();
            setIsOnline(true);
            setItemVersion(bot);
            //從小黑窗中發送訊息
            rl.on('line', async function (line:any) 
            {
                bot.chat(line)
            })

            if (settings.enable_discord_bot) 
            {
                logger.d("有開啟discord bot")
                discordManager.login()
            }

            if (settings.enable_attack) 
            {
                logger.d("有開啟打怪")
                if (settings.enable_discard) 
                {
                    logger.d("有開啟丟垃圾")
                    discardItemer.discardItem()
                }
                if (settings.enable_detect_interrupt) 
                {
                    logger.d("有開啟偵測突襲中斷")
                    raid.detectInterruption()
                }
                if (settings.enable_track)
                {
                    logger.d("有開啟追蹤")
                    tracker.track();    
                }
                raid.raid()
            }
            if (settings.enable_trade_announce) 
            {
                logger.d("有開啟宣傳")
                announcer.startAnnounce()
            }
        });

        bot.on("message", async (jsonMsg:ChatMessage) => {
            const health = new RegExp(/目標生命 \: ❤❤❤❤❤❤❤❤❤❤ \/ ([\S]+)/g); //清除目標生命
            if (!settings.enable_display_health) {
                if (health.test(jsonMsg.toString())) {
                    return;
                } else {
                    console.log(`${jsonMsg.toAnsi()}`);
                    websocketClient!.send(Route.message,jsonMsg.toHTML())
                }
            } else {
                console.log(`${jsonMsg.toAnsi()}`);
                websocketClient!.send(Route.message,jsonMsg.toHTML())
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
                        {
                            bot.chat(match![2].slice(4))
                            break
                        }
                        case "exchange": //經驗交換物品
                        {
                            await exchangeManager.exchange_item(playerId, args)
                            break
                        }
                        case "stop": //停止交換物品
                        {
                            exchangeManager.stopExchange(playerId)
                            break
                        }
                        case "item": //查詢經驗能換多少物品
                        {
                            exchangeManager.inquire(playerId, args)
                            break
                        }
                        case "equip": //裝備整套裝備
                        {
                            raid.equipped()
                            break
                        }
                        case "unequip": //脫下整套裝備
                        {
                            raid.unequipped()
                            break
                        }
                        case "switch": //更換宣傳詞
                        {
                            announcer.switchAnnouncement(playerId)
                            break
                        }
                        case "throw": //丟棄所有物品
                        {
                            await discardItemer.discardAllItems()
                            break
                        }
                        case "help": //取得指令幫助
                        {
                            informer.help(playerId)
                            break
                        }
                        case "version": //查詢版本
                        {
                            informer.version(playerId)
                            break
                        }
                        case "exp":  //查詢經驗值
                        {
                            informer.experience(playerId)
                            break
                        }
                        case "about":  //關於此bot
                        {
                            informer.about(playerId)
                            break
                        }
                        case "currentlog": //取得當前拾取紀錄log
                        {
                            if(settings.enable_track)
                            {
                                logger.d("有開啟追蹤")
                                tracker.getCurrentTrackLog(playerId, args);
                            }
                            else
                            {
                                logger.d("沒有開啟追蹤")
                                bot.chat(`/m ${playerId} ${localizer.format("TRACK_COMMAND_ERROR")}`)
                            }
                            break;
                        }
                        case "fulllog": //取得所有拾取紀錄log
                        {
                            if(settings.enable_track)
                            {
                                logger.d("有開啟追蹤")
                                tracker.getFullTrackLog(playerId);
                            }
                            else
                            {
                                logger.d("沒有開啟追蹤")
                                bot.chat(`/m ${playerId} ${localizer.format("TRACK_COMMAND_ERROR")}`)
                            }
                            break;
                        }
                        case "pay": //轉帳
                        {
                            financer.pay(playerId,args);
                            break;
                        }
                        case "payAll":
                        case "payall": //轉帳所有錢
                        {
                            financer.payall(playerId,args);
                            break;
                        }
                        case "money": //查詢餘額
                        {
                            financer.money(playerId);
                            break;
                        }
                        case "cancelpay": //取消轉帳
                        {
                            financer.cancelPay(playerId);
                            break;
                        }
                        case "reload":
                        {
                            getConfig()
                            getSettings()
                            setLocalization()
                            if (settings.enable_trade_announce) 
                            {
                                announcer.reloadAnnounce();
                            }
                            if (settings.enable_discard) 
                            {
                                discardItemer.reloadDiscardItem();
                            }
                            if (settings.enable_detect_interrupt) 
                            {
                                raid.reloadRaid()
                            }
                            if (settings.enable_track)
                            {
                                tracker.reloadTrack()
                            }
                            break;
                        }
                        case "tps":
                        {
                            bot.chat(`/m ${playerId} ${bot.getTps()}`)
                            break;
                        }
                        case "exit": //關閉bot
                        {
                            bot.chat(`/m ${playerId} ${localizer.format("SHUTDOWN")}`)
                            console.log(`Shutdown in 10 seconds`)
                            setTimeout(function () {
                                process.exit()
                            }, 10000)
                            break
                        }
                        default: {
                            replyManager.whitelistedReply(playerId, msg)
                        }
                    }
                } else {
                    replyManager.noWhitelistedReply(playerId, msg)

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
                        discordManager.send(localizer.format("DETECT_BROADCAST_MSG_PREFIX") as string, args)
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
            if (settings.enable_discard) 
            {
                discardItemer.stopDiscardItemInterval();
            }
            if(settings.enable_trade_announce)
            {
                announcer.stopAnnounceInterval();
            }
            if (settings.enable_detect_interrupt) 
            {
                raid.raidDown()
            }
            exchangeManager.errorStop()
            setIsOnline(false);
            rl.removeListener('line', rl.listeners('line')[0]); //移除監聽(此事件不會自動移除)
            setTimeout(function () {
                connect();
            }, 10000)
        });

        bot.once('error', (reason:any) => {
            logger.e(reason)
            logger.writeErrorLog(reason)
        })
    }

    connect();
} 
catch (err:any) {
    console.error(err)
    console.log('process exit in 10 sec...')
    new Promise(resolve => setTimeout(async () => {
        logger.writeErrorLog(err)
        process.exit()
    }, 10000))
}









