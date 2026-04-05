import { buildApp } from './app.js';
import { getServerConfig } from './lib/server-config.js';

const serverConfig = getServerConfig();
const app = buildApp({ webDistDir: serverConfig.webDistDir });

app.listen({ host: serverConfig.host, port: serverConfig.port }).catch((error) => {
  console.error(error);
  process.exit(1);
});
