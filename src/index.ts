import { WebSocketServer } from "ws";
import express from "express";
import cors from "cors";
import * as mediasoup from "mediasoup";
import type { Worker, Router } from "mediasoup/node/lib/types";

const app = express();
app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
  })
);

let worker: Worker, router: Router;
const transports = new Map();
const producers = new Map();
const consumers = new Map();

const startMediaSoup = async () => {
  worker = await mediasoup.createWorker({
    rtcMinPort: 2000, 
    rtcMaxPort: 2020,
  });
  console.log("worker created");

  router = await worker.createRouter({
    mediaCodecs: [
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
      },
    ],
  });
  console.log("router created");
};

startMediaSoup();

const server = app.listen(8080, () => {
  console.log("WebSocket server listening on port 8080");
});
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.on("error", console.error);
  ws.on("message", async (message: any) => {
    const { clientId, action, data } = JSON.parse(message);

    if (action === "getRtpCapabilities") {
      ws.send(
        JSON.stringify({
          action: "rtpCapabilities",
          data: router.rtpCapabilities,
        })
      );
    }

    if (action === "createTransport") {
      const transport = await router.createWebRtcTransport({
        listenIps: [{ ip: "0.0.0.0", announcedIp: "47.15.77.10" }],
        enableTcp: true,
        enableUdp: true,
        preferUdp: true,
      });

      transports.set(clientId, transport);
      ws.send(
        JSON.stringify({
          action: "transportCreated",
          data: {
            id: transport.id,
            iceCandidates: transport.iceCandidates,
            iceParameters: transport.iceParameters,
            dtlsParameters: transport.dtlsParameters,
          },
        })
      );
    }

    if (action === "connectTransport") {
      const transport = transports.get(clientId);
      await transport.connect({ dtlsParameters: data });
    }

    if (action === "produce") {
      const transport = transports.get(clientId);
      const producer = await transport.produce({
        kind: data.kind,
        rtpParameters: data.rtpParameters,
      });
      producers.set(clientId, producer);
    }

    if (action === "consume") {
      const transport = transports.get(clientId);
      const producer = producers.get(clientId);
      const consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities: data.rtpCapabilities,
        paused: false,
      });
      consumers.set(clientId, consumer);

      ws.send(
        JSON.stringify({
          action: "consumerCreated",
          data: {
            id: consumer.id,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          },
        })
      );
    }
  });
});