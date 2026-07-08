import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { createApp } from "./src/app";
import { connectToDatabase } from "./src/config/db";
import { env } from "./src/config/env";

async function bootstrap() {
  await connectToDatabase();

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`Backend listening on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
