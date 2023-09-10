import {
    Client,
    Intents,
    Message,
    User,
    TextChannel,
} from 'discord.js';
import { localizer } from '../../utils/localization';
import { Setting } from '../../models/files';
import { logger } from '../../utils/logger';
import { Bot } from 'mineflayer';

const intents = new Intents(['GUILDS', 'GUILD_MESSAGES', 'DIRECT_MESSAGES']);
const client = new Client({
    intents: intents,
    partials: [
        'CHANNEL', // Required to receive DMs
    ],
});

class DiscordBotException extends Error 
{
    constructor(message: string) {
      super(message);
      this.name = "DiscordBotException";
    }
}

export class DiscordManager
{
    settings:Setting;
    messageRegex:RegExp;

    replyId:string = ""; //回覆的玩家ID
    map:Map<string, string> = new Map(); 
    command: string = ''; //指令
    userName:string = ""; //DC bot名稱
    error:string = ""; //錯誤訊息
    content:string = ""; //指令參數
    
    modify_replyId (id: string):void
    {
        this.replyId = id;
    };
    /**
     * 發送訊息至Discord
     * @param { string } sender - 發送者ID 
     * @param { string } msg - 訊息內容 
     */
    send (sender: string, msg: string):void
    {
        logger.i("進入send，發送訊息至DC")
        if (this.settings.enable_send_msg_to_channel) 
        {
            logger.d("開啟訊息轉發至頻道")
            const channel: TextChannel | null = client.channels.cache.get(this.settings.channel_ID) as TextChannel | null;
            if (!channel) 
            {
                logger.d("找不到頻道")
                this._setMap();
                logger.l(localizer.format("DC_FORWARD_CHANNEL_NOT_FOUND",this.map) as string);
                return;
            }
            if (sender === "") 
            {
                logger.d("bot自己傳訊息")
                channel.send(`${msg}`);
            } 
            else 
            {
                logger.d("其他人傳訊息")
                channel.send(`${sender} : ${msg}`);
            }
        } 
        else 
        {
            logger.d("開啟訊息轉發至私訊")
            client.users.fetch(this.settings.forward_DC_ID).then((user: User) => {
                if (sender === "") 
                {
                    logger.d("bot自己傳訊息")
                    user.send(msg).catch((err: Error) => {
                        logger.e(err.message);
                    });
                } 
                else 
                {
                    logger.d("其他人傳訊息")
                    user.send(sender + " : " + msg).catch((err: Error) => {
                        logger.e(err.message);
                    });
                }
            });
        }
    };
    /**
     * 上線discord bot
     * @param { Bot } bot - bot實例 
     */
    login(bot: Bot) 
    {
        logger.i("進入login，上線discord bot")
        client.once('ready', () => {    
            logger.i("discord bot 上線完成")
            this.userName = client.user?.username || '';
            this._setMap();
            logger.l(`${localizer.format("DC_BANNER",this.map)}`);
            logger.l(`${localizer.format("DC_BOT_ONLINE",this.map)}`);
            client.users.fetch(this.settings.forward_DC_ID).then((user: User | undefined) => {
                if (!user) {
                    logger.l(`${localizer.format("DC_USER_NOT_FOUND",this.map)}`);
                    throw new DiscordBotException("Discord User Not Found");
                } else {
                    logger.l(`${localizer.format("DC_USER_FOUND",this.map)}`);
                }
                logger.l(`${localizer.format("DC_BANNER",this.map)}`);
            });
        });

        if (this.settings.enable_reply_msg) 
        {
            logger.d("有開啟回覆訊息")
            client.removeAllListeners('messageCreate');
            client.on('messageCreate', (msg: Message) => {
                this._setMap();
                if (msg.author?.id === client.user?.id)
                {
                    logger.d("messageCreate:第一種情況 bot自己傳訊息");
                    return;
                }
                if (msg.channel?.id !== this.settings.channel_ID && msg.channel?.type !== "DM")
                {
                    logger.d("messageCreate:第二種情況 非指定頻道發訊息且不是私訊");
                    return;
                }
                if (msg.author?.id !== this.settings.forward_DC_ID) 
                {
                    logger.d("messageCreate:第三種情況 不是指定的DC用戶發訊息至指定頻道");
                    msg.channel.send(`${localizer.format("DC_NO_PERMISSION",this.map)}`);
                    return;
                }
                if ((msg.channel.type === "DM" || msg.channel.type === "GUILD_TEXT") && msg.author?.id === this.settings.forward_DC_ID) 
                {
                    logger.d("messageCreate:第四種情況");
                    if (this.messageRegex.test(msg.content)) 
                    {
                        this.command = msg.content.replace(this.settings.discord_cmd_prefix,"").split(" ")[0];
                        this._setMap();
                        switch (this.command) {
                            case "cmd":
                                this.content = msg.content.slice(5);
                                this._setMap();
                                bot.chat(this.content);
                                this.send("", localizer.format("DC_COMMAND_EXECUTED",this.map) as string);
                                break;
                            default: {
                                this.send("", localizer.format("DC_NO_MATCH_COMMAND",this.map)as string);
                                this.command = "";
                            }
                        }
                    } 
                    else if (msg.reference !== null && msg.mentions.repliedUser !== null) 
                    {
                        msg.channel.messages.fetch(msg.id).then((message: Message | undefined) => {
                            let splited_msg = message?.content.split(' ') || [];
                            if (splited_msg.length === 3) {
                                this.replyId = splited_msg[0];
                            } else if (splited_msg.length === 1) {
                                this.replyId = splited_msg[0].substring(6);
                            }
                            if (msg.mentions.repliedUser!.id === client.user?.id) 
                            {
                                bot.chat(`/m ${this.replyId} ${msg.content}`);
                                this.send("", localizer.format("DC_RESPONSE_MSG",this.map) as string);
                            }
                        })
                        .catch(() =>
                            logger.l("replied msg not found")
                        );
                    } 
                    else if (this.replyId !== "") 
                    {
                        bot.chat(`/m ${this.replyId} ${msg.content}`);
                        this.send("", localizer.format("DC_RESPONSE_MSG",this.map) as string);
                    } 
                    else 
                    {
                        this.send("", localizer.format("NO_ONE_REPLIED") as string);
                    }
                }
            });
        }

        client.login(this.settings.bot_token).catch((e: Error) => {
            this.error = e.toString();
            this._setMap();
            logger.l(`${localizer.format("DC_BANNER",this.map)}`);
            logger.l(`${localizer.format("DC_BOT_OFFLINE",this.map)}`);
            logger.l(`${localizer.format("DC_BANNER",this.map)}`);
            throw new DiscordBotException(this.error);
        });
    };
    /**
     * 內部函數，建立變數的映射值
     */
    _setMap()
    {
        logger.i("設定變數的映射值")
        this.map.set("name",this.userName)
        this.map.set("command",this.command)
        this.map.set("content",this.content)
        this.map.set("error",this.error)
        this.map.set("replyId",this.replyId)
    }
    constructor(settings:Setting)
    {
        logger.i("建立DiscordManager物件")
        this.settings = settings;
        this.messageRegex = new RegExp("^" + this.settings.discord_cmd_prefix);
    }
}