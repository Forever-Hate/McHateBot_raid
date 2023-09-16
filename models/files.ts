//config檔
export interface Config {
    readonly ip: string,
    readonly port: number,
    readonly username: string,
    readonly password: string,
    readonly version:string,
    readonly auth: string,
    readonly language: string,
    readonly whitelist: string[]
}
//setting檔
export interface Setting {
    readonly enable_inventory_viewer:boolean;
    readonly enable_detect_broadcast: boolean;
    
    readonly enable_attack: boolean;
    readonly health: boolean;
    readonly Interval_ticks: number;
    readonly attack_radius: number;
    readonly mob_list: string[];
    readonly enable_detect_interrupt: boolean;
    readonly check_raid_cycleTime: number;
    
    readonly enable_track: boolean;
    readonly enable_track_log:boolean;
    readonly track_record:number;
    readonly track_list:string[];
    
    readonly enable_discard: boolean;
    readonly enable_discard_msg: boolean;
    readonly discarditem_cycleTime: number;
    readonly enable_stay_totem:boolean;
    readonly enable_totem_notifier:boolean;
    readonly enable_auto_stack_totem:boolean;
    readonly stayItem_list: string[];
    
    readonly enable_exchange_logs: boolean;
    readonly no_item_exchange_interval: number;
    readonly item_exchange_interval: number;
    
    readonly enable_trade_announcement: boolean;
    readonly trade_announce_cycleTime: number;
    readonly enable_trade_content_cycle: boolean;
    readonly content_skip_count: number;
    readonly trade_content: string[][];
    // readonly enable_reconnect_tp: boolean;
    // readonly reconnect_tp_point: string;
    readonly enable_pay_log:boolean;
    readonly transfer_interval:number;
    
    readonly enable_reply_msg: boolean;
    readonly forward_ID: string;
    readonly clear_reply_id_delay_time: number;
    readonly enable_auto_reply: boolean;
    readonly auto_reply_week: string;
    readonly auto_reply_time: string;
    readonly auto_reply_content: string;
    
    readonly enable_discord_bot: boolean;
    readonly forward_DC_ID: string;
    readonly enable_send_msg_to_channel: boolean;
    readonly directly_send_msg_to_dc: boolean;
    readonly channel_ID: string;
    readonly enable_slash_command:boolean;
    readonly bot_application_ID:string;
    readonly bot_token: string;
}
// 語言檔
export interface Language {
    [key: string]: string | string[];
    readonly LOADING_DONE: string;
    readonly SHUTDOWN: string;

    readonly NEED_MORE_CONTENT: string;
    readonly NEXT_INDEX: string;
    readonly CONTENT: string;

    readonly DETECT_INTERRUPT_MSG_DC_PREFIX: string;
    readonly DETECT_INTERRUPT_MSG_DC_STEM: string;
    readonly DETECT_INTERRUPT_MSG_GAME_STEM: string;

    readonly DETECT_BROADCAST_MSG_PREFIX: string;
    readonly DISCARD_MSG: string;
    readonly TOTEM_NOT_ENOUGH_ERROR:string;

    readonly EXP: string;
    readonly HELP: string;
    readonly COMMAND_LIST:string[];
    readonly VERSION: string;
    readonly ABOUT: string[];

    readonly EXCHANGE_NO_PLAYER_ERROR: string;
    readonly EXCHANGE_INVALID_POSITION_ERROR: string;
    readonly EXCHANGE_FORMAT_ERROR: string;
    readonly EXCHANGE_START: string;
    readonly EXCHANGE_STOP: string;
    readonly EXCHANGE_NOT_EXCHANGE_NOW:string;
    readonly EXCHANGE_BACKPACK_IS_FULL_ERROR: string;
    readonly EXCHANGE_INQUIRE_FORMAT_ERROR: string;
    readonly EXCHANGE_ITEM_INQUIRE: string;
    readonly EXCHANGE_NO_ITEM_INQUIRE: string;

    readonly REPLIED: string;
    readonly NO_ONE_REPLIED: string;
    readonly OFFLINE: string;
    readonly FORWARD_TO_DC: string;
    readonly FORWARDED_IN_GAME: string;

    readonly DC_BANNER: string;
    readonly DC_BOT_ONLINE: string;
    readonly DC_BOT_OFFLINE: string;
    readonly DC_USER_FOUND: string;
    readonly DC_USER_NOT_FOUND: string;
    readonly DC_SLASH_COMMAND_REGISTERED:string;
    readonly DC_SLASH_COMMAND_NOT_REGISTERED:string;
    readonly DC_FORWARD_CHANNEL_NOT_FOUND: string;
    readonly DC_COMMAND_EXECUTED: string;
    readonly DC_COMMAND_EXECUTED_FAIL:string;
    readonly DC_NO_PERMISSION: string;
    readonly DC_RESPONSE_MSG: string;

    readonly TRACK_COMMAND_ERROR: string;
    readonly TRACK_BANNER: string;
    readonly TRACK_TIME: string;
    readonly TRACK_MAIN_TITLE: string;
    readonly TRACK_SUB_TITLE: string;
    readonly TRACK_SUB_ITEM: string;
    readonly TRACK_THIRD_TITLE: string;
    readonly TRACK_THIRD_ITEM: string;
}