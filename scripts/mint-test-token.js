// Temporary helper: mint a test JWT for local endpoint testing (dev only)
const fs = require("fs");
const s = fs.readFileSync("apps/frontend/.env", "utf8");
const m = s.match(/^JWT_SECRET=(.*)$/m);
if (!m) { console.log("NO_SECRET"); process.exit(0); }
const secret = m[1].trim().replace(/^['"]|['"]$/g, "");
const jwt = require("/Users/devanthakur/Carelim/node_modules/jsonwebtoken");
const payload = {
  userId: "system-test",
  email: "admin@test.local",
  role: "Administrator",
  type: "user",
  tenantId: "cmtcd5qfz000orciy7no266jo",
};
console.log(jwt.sign(payload, secret, { expiresIn: "120m" }));
