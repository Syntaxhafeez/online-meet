import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  SERVER_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  CLIENT_ORIGIN: z.string().default("http://localhost:3000"),
  MEDIASOUP_LISTEN_IP: z.string().default("0.0.0.0"),
  MEDIASOUP_ANNOUNCED_IP: z.string().optional(),
  MEDIASOUP_MIN_PORT: z.coerce.number().default(40000),
  MEDIASOUP_MAX_PORT: z.coerce.number().default(40100)
});

export const env = schema.parse(process.env);
