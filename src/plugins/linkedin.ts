import fp from "fastify-plugin";
import { createRedisClient } from "../cache.js";
import { VoyagerClient } from "../linkedin/client.js";
import { LinkedInSession } from "../linkedin/session.js";

export interface LinkedInDecoration {
  session: LinkedInSession;
  client: VoyagerClient;
}

declare module "fastify" {
  interface FastifyInstance {
    linkedin: LinkedInDecoration;
  }
}

export default fp(async (fastify) => {
  const redis = await createRedisClient();
  const session = new LinkedInSession(redis);
  await session.load();

  if (!session.isLoaded) {
    fastify.log.warn(
      "No LinkedIn session configured — profile requests will return 503 until LI_AT/JSESSIONID or a persisted Redis session is available.",
    );
  }

  const client = new VoyagerClient(session);
  fastify.decorate("linkedin", { session, client });

  fastify.addHook("onClose", async () => {
    if (redis) await redis.quit();
  });
});
