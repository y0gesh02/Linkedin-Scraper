import fp from "fastify-plugin";
import { type Cache, createCache } from "../cache.js";

declare module "fastify" {
  interface FastifyInstance {
    cache: Cache;
  }
}

export default fp(async (fastify) => {
  const cache = await createCache();
  fastify.decorate("cache", cache);
  fastify.addHook("onClose", async () => {
    await cache.close();
  });
});
