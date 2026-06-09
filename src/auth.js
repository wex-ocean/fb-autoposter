const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const AUTH_PATH = path.join(__dirname, "../data/auth.json");

// ── Read / Write auth.json ────────────────────────────────────────

function readAuth() {
  const raw = fs.readFileSync(AUTH_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeAuth(data) {
  fs.writeFileSync(AUTH_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// ── Verify password ───────────────────────────────────────────────

async function verifyPassword(plain) {
  const { passwordHash } = readAuth();
  if (!passwordHash) return false;
  return await bcrypt.compare(plain, passwordHash);
}

// ── Auth middleware (protects all dashboard routes) ───────────────

function requireAuth(req, res, next) {
  const openPaths = ["/login.html", "/api/login", "/api/logout"];
  if (openPaths.includes(req.path)) return next();
  if (req.session && req.session.authenticated) return next();

  // API requests → return 401
  if (req.path.startsWith("/api/")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Page requests → redirect to login
  return res.redirect("/login.html");
}

// ── CLI: set new password (run once: node src/auth.js) ────────────

async function setPasswordCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n🔐 FB AutoPoster — Password Setup\n");

  rl.question("Enter new password: ", async (password) => {
    rl.question("Confirm password:   ", async (confirm) => {
      rl.close();

      if (!password || password.length < 4) {
        console.log("\n❌ Password must be at least 4 characters.\n");
        process.exit(1);
      }

      if (password !== confirm) {
        console.log("\n❌ Passwords do not match.\n");
        process.exit(1);
      }

      const hash = await bcrypt.hash(password, 10);
      writeAuth({ passwordHash: hash });

      console.log("\n✅ Password set successfully!");
      console.log("📁 Saved to data/auth.json");
      console.log("🚀 Now run: npm start\n");
      process.exit(0);
    });
  });
}

// Run CLI if called directly: node src/auth.js
if (require.main === module) {
  setPasswordCLI();
}

module.exports = { verifyPassword, requireAuth };