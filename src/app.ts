import express from "express";
import fs from "node:fs";
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

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/update", async (req, res) => {
  const result = K8UP_STATUS_UPDATE_SCHEMA.safeParse(req.body);
  if (!result.success) {
    console.log(`Failed to parse input: ${result.error}`);
    res.sendStatus(400);
    return;
  }
  const update = result.data;
  const hookTarget = hookMap.get(update.name);
  if (hookTarget === undefined) {
    console.log(`Unkown hook for ${update.name} requested`);
    res.sendStatus(404);
    return;
  }
  if (update.backup_metrics.errors > 0) {
    console.log(
      `Backup of ${update.name} got ${update.backup_metrics.errors} errors, not triggering hook`
    );
    res.sendStatus(200);
    return;
  }
  console.log(`Forwarding to hook target ${hookTarget}`);
  const response = await fetch(hookTarget);
  if (!response.ok) {
    console.log("Failed to forward update to hook");
    res.sendStatus(500);
    return;
  }
  res.sendStatus(200);
});

app.listen(port, host, () => {
  return console.log(`K8up to Kuma is listening at http://${host}:${port}`);
});
