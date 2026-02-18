/**
 * Web Content API
 *
 * Pay-per-call web content extraction and search.
 * Agents pay with USDC on Base via x402.
 */

import express from "express";
import { extractRouter } from "./routes/extract.js";
import { searchRouter } from "./routes/search.js";

const PORT = parseInt(process.env.PORT || "4021");
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || "";
const FACILITATOR_URL =
  process.env.FACILITATOR_URL || "https://www.x402.org/facilitator";
const NETWORK = (process.env.NETWORK || "eip155:84532") as `${string}:${string}`; // Base Sepolia testnet

const app = express();
app.use(express.json());

// ─── Service Info (free) ─────────────────────────────────────

let paymentMode = "free";

app.get("/", (_req, res) => {
  res.json({
    name: "Web Content API",
    version: "1.0.0",
    description:
      "Pay-per-call web content extraction and search. Powered by x402.",
    endpoints: {
      "GET /api/extract?url=": {
        price: "$0.002 USDC",
        description: "Extract clean text content from any URL",
      },
      "GET /api/search?q=": {
        price: "$0.003 USDC",
        description: "Search the web and return structured results",
      },
    },
    payment: {
      protocol: "x402",
      network: `Base Sepolia (${NETWORK})`,
      token: "USDC",
      wallet: WALLET_ADDRESS,
      mode: paymentMode,
    },
  });
});

// ─── Health check (free) ─────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── x402 Payment Middleware ─────────────────────────────────

async function setupPayments() {
  if (!WALLET_ADDRESS) {
    console.log("No WALLET_ADDRESS set — running in free mode (no payments)");
    return;
  }

  try {
    const { paymentMiddleware, x402ResourceServer } = await import("@x402/express");
    const { ExactEvmScheme } = await import("@x402/evm/exact/server");
    const { HTTPFacilitatorClient } = await import("@x402/core/server");

    const facilitator = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
    const resourceServer = new x402ResourceServer(facilitator).register(
      NETWORK,
      new ExactEvmScheme(),
    );

    app.use(
      paymentMiddleware(
        {
          "GET /api/extract": {
            accepts: [
              {
                scheme: "exact",
                price: "$0.002",
                network: NETWORK,
                payTo: WALLET_ADDRESS,
              },
            ],
            description: "Extract clean text content from any URL",
            mimeType: "application/json",
          },
          "GET /api/search": {
            accepts: [
              {
                scheme: "exact",
                price: "$0.003",
                network: NETWORK,
                payTo: WALLET_ADDRESS,
              },
            ],
            description: "Search the web and return structured results",
            mimeType: "application/json",
          },
        },
        resourceServer,
      ),
    );

    paymentMode = "x402";
    console.log(`x402 payment enabled → ${WALLET_ADDRESS}`);
    console.log(`Facilitator: ${FACILITATOR_URL}`);
    console.log(`Network: ${NETWORK}`);
  } catch (err: any) {
    console.error(`x402 setup failed — running in free mode: ${err.message}`);
    paymentMode = "free (x402 setup failed)";
  }
}

// ─── Start ───────────────────────────────────────────────────

async function start() {
  await setupPayments();

  // Routes are added AFTER middleware so x402 can intercept first
  app.use(extractRouter);
  app.use(searchRouter);

  app.listen(PORT, () => {
    console.log(`Web Content API listening on http://localhost:${PORT}`);
  });
}

start();
