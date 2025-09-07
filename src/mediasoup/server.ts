import * as mediasoup from "mediasoup";
import type { Worker, Router } from "mediasoup/types";
import { SendSocketMessage } from "../server.js";
import { getRedisClient } from "../config/redisClient.js";

let worker: Worker;
const routers = new Map<string, Router>();
const transports = new Map();
const producers = new Map();
const consumers = new Map();

export const createWorker = async () => {
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
};

export const createRouter = async (spaceId: string) => {
  const router = await worker.createRouter({
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
  routers.set(spaceId, router);
  return router;
};

export const getRtpCapabilities = (spaceId: string) => {
  const router = routers.get(spaceId);
  if (!router) {
    SendSocketMessage(
      JSON.stringify({ message: "No router found with the give space Id" }),
      "all"
    );
    return;
  }

  JSON.stringify({
    action: "rtpCapabilities",
    data: routers.get(spaceId)?.rtpCapabilities,
  });

  console.log("rtpCapabilities sent");
};

export const createTransports = async (spaceId: string, clientId: string) => {
  const router = routers.get(spaceId);
  if (!router) {
    SendSocketMessage(
      JSON.stringify({
        message: "No router found for the given spaceId",
      }),
      "one",
      clientId
    );
    return;
  }
  const producerTransport = await router.createWebRtcTransport({
    listenIps: [
      {
        ip: "127.0.0.1",
        announcedIp: "10.252.159.245",
      },
    ],
    enableTcp: true,
    enableUdp: true,
    preferUdp: true,
  });

  const consumerTransport = await router.createWebRtcTransport({
    listenIps: [
      {
        ip: "127.0.0.1",
        announcedIp: "10.252.159.245",
      },
    ],
    enableTcp: true,
    enableUdp: true,
    preferUdp: true,
  });
  console.log("client id while creating", clientId); //replace with actual client Id
  transports.set(clientId, {
    producerTransport,
    consumerTransport,
  });

  SendSocketMessage(
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
    }),
    "one",
    clientId
  );
};

export const connectToTransports = async (
  spaceId: string,
  clientId: string,
  transportType: string,
  dtlsParameters: any
) => {
  if (transportType === "producer") {
    const transport = transports.get(clientId).producerTransport;
    await transport.connect({ dtlsParameters });
    SendSocketMessage(
      JSON.stringify({
        action: "producerTransportConnected",
      }),
      "one",
      clientId
    );
  } else if (transportType === "consumer") {
    const transport = transports.get(clientId).consumerTransport;
    await transport.connect({ dtlsParameters });
    SendSocketMessage(
      JSON.stringify({
        action: "consumerTransportConnected",
      }),
      "one",
      clientId
    );
  }
  console.log(`connected to ${transportType} transport`);
};

export const produce = async (clientId: string, data: any) => {
  const transport = transports.get(clientId).producerTransport;
  const producer = await transport.produce({
    kind: data.kind,
    rtpParameters: data.rtpParameters,
  });
  producers.set(clientId, producer);
  SendSocketMessage(
    JSON.stringify({
      action: "newProducer",
      data: {
        id: producer.id,
        producerClientId: clientId,
      },
    }),
    "except",
    clientId
  );
  console.log("producing");
};

export const consume = async (clientId: string, data: any) => {
  const consumerTransportUse = transports.get(clientId).consumerTransport;
  const producerUse = producers.get(data.producerClientId);
  if (!producerUse) return;
  const consumer = await consumerTransportUse.consume({
    producerId: producerUse.id,
    rtpCapabilities: data.rtpCapabilities,
    paused: false,
  });
  consumers.set(clientId, consumer);

  SendSocketMessage(
    JSON.stringify({
      action: "consumerCreated",
      data: {
        id: consumer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        producerId: producerUse.id,
      },
    }),
    "one",
    clientId
  );
  console.log("consuming");
};
