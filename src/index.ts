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

  worker.on("died", () => {
    console.error("mediasoup worker has died");
    setTimeout(() => {
      process.exit();
    }, 2000);
  });

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
  console.log("connection established");
  ws.on("message", async (message: any) => {
    const { clientId, action, data } = JSON.parse(message);

    if (action === "getRtpCapabilities") {
      ws.send(
        JSON.stringify({
          action: "rtpCapabilities",
          data: router.rtpCapabilities,
        })
      );
      console.log("rtpCapabilities sent");
    }

    if (action === "createTransports") {
      console.log("creating transports");
      const producerTransport = await router.createWebRtcTransport({
        listenIps: [{ ip: "127.0.0.1" }],

        enableTcp: true,
        enableUdp: true,
        preferUdp: true,
      });

      const consumerTransport = await router.createWebRtcTransport({
        listenIps: [{ ip: "127.0.0.1" }],
        enableTcp: true,
        enableUdp: true,
        preferUdp: true,
      });
      console.log("client id while creating", clientId);
      transports.set(clientId, {
        producerTransport,
        consumerTransport,
      });

      ws.send(
        JSON.stringify({
          action: "transportsCreated",
          data: {
            producer: {
              id: producerTransport.id,
              iceParameters: producerTransport.iceParameters,
              iceCandidates: producerTransport.iceCandidates,
              dtlsParameters: producerTransport.dtlsParameters,
            },
            consumer: {
              id: consumerTransport.id,
              iceParameters: consumerTransport.iceParameters,
              iceCandidates: consumerTransport.iceCandidates,
              dtlsParameters: consumerTransport.dtlsParameters,
            },
          },
        })
      );
      console.log("Transports created");
    }

    if (action === "connectProducerTransport") {
      console.log("clientid", clientId);

      const producerTransport = transports.get(clientId).producerTransport;
      await producerTransport.connect({ dtlsParameters: data });
      console.log("connected to producer transport");
    }

    if (action === "connectConsumerTransport") {
      console.log("connecting consumer transport---", clientId);
      const consumerTransport = transports.get(clientId).consumerTransport;
      await consumerTransport.connect({ dtlsParameters: data });
      console.log("connected to consumer transport");

      ws.send(
        JSON.stringify({
          action: "consumerTransportConnected",
        })
      );
    }

    if (action === "produce") {
      const transport = transports.get(clientId).producerTransport;
      const producer = await transport.produce({
        kind: data.kind,
        rtpParameters: data.rtpParameters,
      });
      producers.set(clientId, producer);
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              action: "newProducer",
              data: {
                id: producer.id,
                producerClientId: clientId,
              },
            })
          );
        }
      });
      console.log("producing");
    }

    if (action === "consume") {
      const transport = transports.get(clientId).consumerTransport;
      const producer = producers.get(data.producerClientId);
      if (!producer) return;
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
            producerId: producer.id,
          },
        })
      );
      console.log("consuming");
    }
  });
});
