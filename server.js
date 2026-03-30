// server.js (Next.js custom server only)
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const dotenv = require("dotenv");
dotenv.config();
if (process.env.NODE_ENV === "production") {
  require("./src/lib/cron/profile-reminder");
  require("./src/lib/cron/payout-monthly");
  require("./src/lib/cron/invoiceCron");
  require("./src/lib/cron/campaign-reminder");
  require("./src/lib/cron/ambassador-reminder");
  require("./src/lib/cron/inactive-users");
  require("./src/lib/cron/stats-monthly");
  require("./src/lib/cron/commission-lock");
}
// require("./src/lib/cron/stats-test");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "localhost";
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  server.listen(port, () => {
    console.log(`> Next.js Server ready on http://${hostname}:${port}`);
  });
});
