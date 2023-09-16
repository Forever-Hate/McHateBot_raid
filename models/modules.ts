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
    discardItem: () => void;
    stopDiscardItemInterval: () => void;
    tossTotemOfUndying: () => Promise<void>;
    discardAllItems: () => Promise<void>;
    tossItem: (item:Item) => Promise<void>;
}

export interface RaidInterface {
    raid: () => void;
    detectInterruption: () => void;
    raidDown: () => void;
    equipped: () => void;
    unequipped: () => void;
}

export interface AnnounceInterface {
    startAnnounce: (settings: Setting) => void;
    stopAnnounceInterval: () => void;
    switchAnnouncement: (playerId: string | undefined,isfromdiscord:boolean | undefined) => void;

}

export interface InformInterface {
    experience: (playerId: string | undefined,isfromdiscord:boolean | undefined) => string;
    help: (playerId: string | undefined,isfromdiscord:boolean | undefined) => string[];
    version: (playerId: string | undefined,isfromdiscord:boolean | undefined) => string;
    about: (playerId: string | undefined,isfromdiscord:boolean | undefined) => string[];

}

export interface ReplyInterface {
    noWhitelistedReply: (playerId: string, msg: string) => void;
    whitelistedReply: (playerId: string, msg: string,isfromdiscord:boolean | undefined) => string;
}

export interface ExchangeInterface {
    exchange_item: (playerId: string, args: string[],isfromdiscord:boolean | undefined) => Promise<string>
    stopExchange: (playerId: string ,isfromdiscord:boolean | undefined) => Promise<string>
    errorStop:() => void
    inquire: (playerId: string, args: string[]) => void
}

export interface FinanceInterface {
    pay: (playerId:string,args:string[],isfromdiscord:boolean) => Promise<string>
    payall:(playerId:string,args:string[],isfromdiscord:boolean) => Promise<string>
    money:(playerId:string | undefined,isfromdiscord:boolean) => Promise<string>
}