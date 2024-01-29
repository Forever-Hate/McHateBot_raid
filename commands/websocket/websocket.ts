import * as WebSocket from 'ws';
import * as http from 'http';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { logger } from '../../utils/logger';
import { bot, isOnline } from '../main/bot';
import path from 'path';
import { TrackLog, tracker } from '../main/tracker';
import { config, getAvailablePort, settings } from '../../utils/util';

export let websocketClient:WebSocketClient | null = null

export const enum Route
{
  message = "/message",
  player = "/player",
  currentTrack = "/currentTrack",
  fullTrack = "/fullTrack",
  trackLogs = "/trackLogs",

}

export class WebSocketClient
{
  routeMap: Map<Route, WebSocket[]> = new Map();
  app = express();
  server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket Server');
  });
  wss = new WebSocket.Server({ noServer:true });
  
  playerInterval:NodeJS.Timeout | null = null

  /**
   * 傳送訊息至指定路由(websocket)
   * @param { Route } route 路由
   * @param { any } message 訊息
   */
  send(route:Route,message:any)
  {
    logger.i(`進入send，傳送訊息，路由:${route}，訊息:${message}`)
    const clients = this.routeMap.get(route)
    if (clients) 
    {
      // 對所有連線中的 client 廣播訊息
      for (const client of clients) {
        logger.d(client.readyState)
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    }
  }

  constructor()
  {
    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      console.log('Client connected');
      console.log(req.url);
      const route = this.stringToEnum(req.url ?? "")
      if(route)
      {
        if(!this.routeMap.has(route))
        {
          this.routeMap.set(route,[])
        }
        this.routeMap.get(route)?.push(ws)
        
        //只要一連線就傳送資料
        if(route == Route.trackLogs)
        {
          if(settings.enable_track)
          {
            this.send(Route.trackLogs,JSON.stringify(tracker.logList.map((log)=>log.toJson())))
          }
        }
      }
      ws.on('close', () => {
        console.log('Client disconnected');
        //移除連線
        for (const [route, clients] of this.routeMap.entries()) {
          const index = clients.indexOf(ws);
    
          if (index !== -1) {
            clients.splice(index, 1);
          }
    
          if (clients.length === 0) {
            this.routeMap.delete(route);
          }
        }
      });
    });
    
    this.server.on('upgrade', (request: http.IncomingMessage, socket: any, head: Buffer) => {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    });
    
    getAvailablePort(parseInt(process.env.WEBSOCKET_PORT!)).then((port)=>{
      this.server.listen(port, () => {
        console.log(`Server is running on port ${port}`);
      });
    })



    //express伺服器
    const router = express.Router();
    
    //玩家資料路由(API)
    router.get('/player', 
      /* 	
          #swagger.summary = '取得玩家資料'
          #swagger.tags = ['player']
          #swagger.description = '取得bot資訊' */
      /* #swagger.responses[200] = { 
          schema: {  
            $ref: '#/components/schemas/Player'
          },
          description: "玩家資料" } */
      (req, res) => {
        const block = bot.blockAtCursor()
        res.send({
          "ip":config.ip,
          "version":config.version,
          "username":bot.username,
          "uuid":bot.player.uuid,
          "tps":bot.getTps(),
          "money":bot.tablist.header.extra && bot.tablist.header.extra[44] ? bot.tablist.header.extra[44].json['text'].trim():null,
          "coin":bot.tablist.header.extra && bot.tablist.header.extra[48] ? bot.tablist.header.extra[48].json['text'].trim():null,
          "server":bot.tablist.header.extra && bot.tablist.header.extra[54] ? parseInt(bot.tablist.header.extra[54].json['text'].slice(2)):null,
          "currentPlayers":bot.tablist.header.extra && bot.tablist.header.extra[65] ? parseInt(bot.tablist.header.extra[65].json['text']) : null,
          "targetedBlock":block ? {
            "type":block.type,
            "name":block.name,
            "position":block.position
          } : null,
          "position":bot.entity.position,
          "health":bot.health,
          "food":bot.food,
          "level":bot.experience.level,
          "points":bot.experience.points,
          "progress":bot.experience.progress,
          "items":bot.inventory.items(),
        })
    });

    //聊天室訊息路由(API)
    router.get('/message',
      /* 	#swagger.tags = ['message']
          #swagger.description = '取得聊天室訊息' */
      (req, res) => {
        res.send("hi,message")
    });

    //當前拾取紀錄路由(API)
    router.get('/currentTrack',
      /* 	
        #swagger.summary = '取得當前拾取紀錄'
        #swagger.tags = ['track']
        #swagger.description = '取得當前拾取紀錄' */
      /*#swagger.responses[200] = { 
        schema: {  
          $ref: '#/components/schemas/Track'
        },
        description: "當前拾取紀錄" } */
      (req,res)=>{
        if(isOnline)
        {
          if(!settings.enable_track)
          {
            res.send(JSON.stringify({
              "error":"track is disabled"
            }))
            return
          }
          res.send((tracker.getTrackLog(true) as TrackLog).toJson())
        }
        else
        {
          res.send(JSON.stringify({
            "error":"bot is offline"
          }))
        }
    })

    //完整拾取紀錄路由(API)
    router.get('/fullTrack',
      /* 	
        #swagger.summary = '取得總拾取紀錄'
        #swagger.tags = ['track']
        #swagger.description = '取得總拾取紀錄' */
      /*#swagger.responses[200] = { 
        schema: {  
          $ref: '#/components/schemas/Track'
        },
        description: "總拾取紀錄" } */
      (req,res)=>{
        if(isOnline)
        {
          if(!settings.enable_track)
          {
            res.send(JSON.stringify({
              "error":"track is disabled"
            }))
            return
          }
          res.send((tracker.getTrackLog(false) as TrackLog).toJson())
        }
        else
        {
          res.send(JSON.stringify({
            "error":"bot is offline"
          }))
        }
    })

    //歷史拾取紀錄路由(API)
    router.get('/trackLogs',
      /* 	
        #swagger.summary = '取得歷史拾取紀錄'
        #swagger.tags = ['track']
        #swagger.description = '取得歷史拾取紀錄(共25個)' */
      /*#swagger.responses[200] = { 
        schema: {  
          $ref: '#/components/schemas/TrackList'
        },
        description: "歷史紀錄" } */
      (req,res)=>{
      if(!settings.enable_track)
      {
        res.send(JSON.stringify({
          "error":"track is disabled"
        }))
        return
      }
      res.send(tracker.logList.map((log)=>log.toJson()))
    })

    //swagger路由
    router.use('/api-docs', process.env.DEVELOP == 'true' ? swaggerUi.serve :express.static(path.join(__dirname,'../../dist')));
    
    if(process.env.DEVELOP == 'true')
    {
      router.get('/api-docs', 
        // #swagger.ignore = true
        swaggerUi.setup(require(`${process.cwd()}/swagger-output.json`))
      );
    }

    this.app.use('/', router);
    getAvailablePort(parseInt(process.env.EXPRESS_PORT!)).then((port)=>{
      this.app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
      });
    })
  }

  /*
  * 字串轉Enum
  */
  stringToEnum(value: string): Route | undefined {
    switch (value) {
      case "/message":
        return Route.message;
      case "/player":
        return Route.player;
      case "/currentTrack":
        return Route.currentTrack;
      case "/fullTrack":
        return Route.fullTrack;
      case "/trackLogs":
        return Route.trackLogs;
      default:
        return undefined; 
    }
  }

  /**
   * 更新資料(每秒)
   */
  refreshData()
  {
    logger.i("進入refresh，更新資料")
    this.playerInterval = setInterval(()=>{
      if(isOnline)
      {
        const block = bot.blockAtCursor()
        this.send(Route.player,JSON.stringify({
          "ip":config.ip,
          "version":config.version,
          "username":bot.username,
          "uuid":bot.player.uuid,
          "tps":bot.getTps(),
          "money":bot.tablist.header.extra && bot.tablist.header.extra[44] ? bot.tablist.header.extra[44].json['text'].trim():null,
          "coin":bot.tablist.header.extra && bot.tablist.header.extra[48] ? bot.tablist.header.extra[48].json['text'].trim():null,
          "server":bot.tablist.header.extra && bot.tablist.header.extra[54] ? parseInt(bot.tablist.header.extra[54].json['text'].slice(2)):null,
          "currentPlayers":bot.tablist.header.extra && bot.tablist.header.extra[65] ? parseInt(bot.tablist.header.extra[65].json['text']) : null,
          "targetedBlock":block ? {
            "type":block.type,
            "name":block.name,
            "position":block.position
          } : null,
          "position":bot.entity.position,
          "health":bot.health,
          "food":bot.food,
          "level":bot.experience.level,
          "points":bot.experience.points,
          "progress":bot.experience.progress,
          "items":bot.inventory.items(),
        }))
        if(settings.enable_track)
        {
          this.send(Route.currentTrack,JSON.stringify((tracker.getTrackLog(true) as TrackLog).toJson()))
          this.send(Route.fullTrack,JSON.stringify((tracker.getTrackLog(false) as TrackLog).toJson()))
        }
        else
        {
          this.send(Route.currentTrack,JSON.stringify({
            "error":"track is disabled"
          }))
          this.send(Route.fullTrack,JSON.stringify({
            "error":"track is disabled"
          }))
          this.send(Route.trackLogs,JSON.stringify({
            "error":"track is disabled"
          }))
        }
      }
      else
      {
        this.send(Route.player,JSON.stringify({
          "error":"bot is offline"
        }))
        this.send(Route.currentTrack,JSON.stringify({
          "error":"bot is offline"
        }))
        this.send(Route.fullTrack,JSON.stringify({
          "error":"bot is offline"
        }))
      }
    },1000)
  }
  /**
   * 停止更新資料
   */
  stopRefreshData()
  {
    logger.i("進入stopRefreshData，停止更新資料")
    if(this.playerInterval)
    {
      clearInterval(this.playerInterval)
    }
  }

  static init()
  {
    logger.i("進入init，初始化websocket")
    websocketClient = new WebSocketClient()    
  }
  
}