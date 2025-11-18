import { WebSocketServer } from "ws";
import { getRedisClient } from "./config/redisClient.js";
import { prisma } from "./db.js";
import {
  connectToTransports,
  consume,
  createRouter,
  createTransports,
  createWorker,
  getRtpCapabilities,
  produce,
} from "./mediasoup/server.js";

let wss: WebSocketServer;
const redisClient = await getRedisClient();

export const startWebSocketServer = async (server: any) => {
  wss = new WebSocketServer({ server });
  await createWorker();

  wss.on("connection", async (ws) => {
    ws.on("error", console.error);
    console.log("connection established");
    ws.on("message", async (message: any) => {
      const { clientId, action, data } = JSON.parse(message);
      await createRouter(data.spaceId);


      switch (action) {
        
        case "startSession":
          const spaceId = data.spaceId;
          const hostId = data.hostId;
          await createRouter(spaceId);
          await redisClient.hSet(`space:${spaceId}`, {
            status: "active",
            recording: "false",
            host: hostId,
          });
          await redisClient.sAdd(`space:${spaceId}:participants`, hostId);

          await prisma.space.update({
            where: { id: spaceId },
            data: { status: "active" },
          });

          SendSocketMessage(
            JSON.stringify({ action: "Session started" }),
            "all"
          );
          break;

        case "getRtpCapabilities":
          getRtpCapabilities(data.spaceId, clientId);
          break;

        case "createTransports":
          createTransports(data.spaceId, data.clientId);
          break;

        case "connectProducerTransport":
          console.log("clientid", clientId);
          await connectToTransports(
            data.spaceId,
            data.clientId,
            "producer",
            data
          );
          break;

        case "connectConsumerTransport":
          await connectToTransports(
            data.spaceId,
            data.clientId,
            "consumer",
            data
          );
          break;

        case "produce":
          await produce(clientId, data);
          break;

        case "consume":
          await consume(clientId, data);
          break;
      }
    });
  });
};

type Target = "all" | "one" | "except";

export const SendSocketMessage = (
  messageData: any,
  target: Target,
  clientId?: string
) => {
  if (!wss) {
    console.log("NO websocket connection")
    return
  };


  //The clientId and ws ClintId is different here, fix that shit.
  //Get the clientId from the websocket client and send that shit here. 

  switch (target) {
    case "all":
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageData);
        }
      });
      break;

    case "one":
      wss.clients.forEach((client: any) => {
        if (client.id === clientId && client.readyState === WebSocket.OPEN) {
          console.log("sending ws msg")
          client.send(messageData);
        }
      });
      break;

    case "except":
      wss.clients.forEach((client: any) => {
        if (client.id !== clientId && client.readyState === WebSocket.OPEN) {
          client.send(messageData);
        }
      });
      break;
  }
};
