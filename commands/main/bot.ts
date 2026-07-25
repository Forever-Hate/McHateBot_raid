import type { Bot, BotOptions } from "mineflayer";
import type { Config } from "../../models/files.ts";
import { logger } from "../../utils/logger.ts";
import fs from "node:fs";

import mineflayer from 'mineflayer';  //讀取mineflayer模塊

export let bot:Bot;
export let isOnline:boolean = false;

export default function login(): Promise<Bot>
{
    return new Promise((resolve, reject) => {
        logger.i("進入login，登入bot")
        const config:Config = JSON.parse(fs.readFileSync(`${process.cwd()}/config.json`, "utf8"));  //讀取config檔案
        const loginOpts:BotOptions = {  //登入資訊
            host: config.ip,  //伺服器ip
            port: config.port >= 0 ? config.port : undefined,  //伺服器port
            username: config.username,  //Minecraft帳號
            password: "",  //Minecraft密碼
            version: config.version,  //bot的Minecraft版本
            auth: config.auth === 'microsoft' ? 'microsoft' : 'offline', //登入驗證器使用offline或者microsoft
            defaultChatPatterns: false,
            checkTimeoutInterval:3600000,
            onMsaCode(data) {
                logger.l(`[微軟帳號身分驗證] 第一次登入\n請使用瀏覽器開啟頁面 ${data.verification_uri} 並輸入代碼 ${data.user_code} 進行身分驗證`)
            },
        }
        try
        {
            bot = mineflayer.createBot(loginOpts)

            bot.once('spawn', () => {
                resolve(bot);
            });

            bot.once('error', (err) => {
                reject(err);
            });
        }
        catch(e:any)
        {
            logger.e(e);
            logger.writeErrorLog(e.toString());
            reject(e);
        }
    });
}
export function setIsOnline(value:boolean)
{
    isOnline = value;
}