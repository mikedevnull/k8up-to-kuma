import express from "express";
import fs from "node:fs";
import { pinoHttp } from "pino-http";
import { pino } from "pino";
const logger = pino({ level: "debug" });

import { CONFIGURATION_SCHEMA } from "./hook-config.schema";
import { K8UP_STATUS_UPDATE_SCHEMA } from "./status-update.schema";

const app = express();
const port = process.env.K8UP_TO_KUMA_PORT
  ? parseInt(process.env.K8UP_TO_KUMA_PORT)
  : 3000;
const host = process.env.K8UP_TO_KUMA_HOST ?? "localhost";
const configFile =
  process.env.K8UP_TO_KUMA_CONFIG ?? "k8up_to_kuma.config.json";

const rawConfig = JSON.parse(fs.readFileSync(configFile).toString());
const config = CONFIGURATION_SCHEMA.parse(rawConfig);

const hookMap = new Map<string, string>();
config.hooks.forEach(({ k8up_name, target }) => hookMap.set(k8up_name, target));

app.use(express.json());
app.use(pinoHttp({ logger }));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/update", async (req, res) => {
  const result = K8UP_STATUS_UPDATE_SCHEMA.safeParse(req.body);
  if (!result.success) {
    req.log.debug({ body: req.body }, "Received unparsable body");
    req.log.error("Failed to parse input: %s", result.error);
    res.sendStatus(400);
    return;
  }
  const update = result.data;
  const hookTarget = hookMap.get(update.name);
  if (hookTarget === undefined) {
    req.log.error({ update }, "Unkown hook requested");
    res.sendStatus(404);
    return;
  }
  req.log.info({ update }, "Received update for %s", hookTarget);
  if (update.backup_metrics.errors > 0) {
    req.log.warn(update, "Backup of got errors, not triggering hook");
    res.sendStatus(200);
    return;
  }
  req.log.debug({ update }, "Forwarding to hook target");
  const response = await fetch(hookTarget);
  if (!response.ok) {
    req.log.error(
      { update },
      "Failed to forward update to hook (%s)",
      response.status
    );
    res.sendStatus(500);
    return;
  }
  req.log.info({ update }, "Sucessfully triggered update hook");
  res.sendStatus(200);
});

app.listen(port, host, () => {
  logger.info(`K8up to Kuma is listening at http://${host}:${port}`);
});
