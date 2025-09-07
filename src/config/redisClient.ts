import { createClient, RedisClientType } from "redis";

let redisClient: RedisClientType;

export const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = createClient();
    redisClient.on("error", (err: any) =>
      console.error("Redis Client Error", err)
    );
    await redisClient.connect();
  }
  return redisClient;
};

