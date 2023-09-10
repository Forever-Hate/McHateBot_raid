import { Bot } from "mineflayer";
import { Setting } from "./files";
import { Item } from "prismarine-item";

export interface LocalizerInterface 
{
    format: (value: string, map?: Map<string, any> | undefined) => string | string[];
}

export interface LoggerInterface {
    writeErrorLog: (e:any) => void;
    writeExchangeLog: (playerId: string, itemName: string, times: number) => void;
    e: (msg:any) => void;
    d: (msg:any) => void;
    i: (msg:any) => void;
    l: (msg:any) => void;
}

export interface DiscardItemInterface {
    discardItem: (bot: Bot) => void;
    stopDiscardItemInterval: () => void;
    tossTotemOfUndying: (bot: Bot) => Promise<void>;
    discardAllItems: (bot: Bot) => Promise<void>;
    tossItem: (bot:Bot, item:Item) => Promise<void>;
}

export interface RaidInterface {
    raid: (bot: Bot) => void;
    detectInterruption: (bot: Bot) => void;
    raidDown: () => void;
    equipped: (bot: Bot) => void;
    unequipped: (bot: Bot) => void;
}

export interface AnnounceInterface {
    startAnnounce: (bot: Bot, settings: Setting) => void;
    stopAnnounceInterval: () => void;
    switchAnnouncement: (bot: Bot, playerId: string, settings: Setting) => void;

}

export interface InformInterface {
    experience: (bot: Bot, playerId: string) => void;
    help: (bot: Bot, playerId: string) => void;
    version: (bot: Bot, playerId: string) => void;
    about: (bot: Bot, playerId: string) => void;

}

export interface ReplyInterface {
    noWhitelistedReply: (bot: Bot, playerId: string, msg: string) => void;
    whitelistedReply: (bot: Bot, playerId: string, msg: string) => void;
}

export interface ExchangeInterface {
    
    exchange_item: (bot: Bot, playerId: string, args: string[]) => Promise<void>
    stopExchange: (bot: Bot, playerId: string) => Promise<void>
    errorStop:() => void
    inquire: (bot: Bot, playerId: string, args: string[]) => void
}