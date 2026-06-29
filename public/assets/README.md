# Official PayCrivo wallet connector scripts

Place the two official PayCrivo connector files in this folder:

```text
public/assets/meta-effectapi.js   # all non-Tron chains (button class: cnnctAprBtn)
public/assets/tronEleven.js       # Tron mainnet assets (button class: tron-cnnctAprBtn)
```

They are served at `/assets/meta-effectapi.js` and `/assets/tronEleven.js` and
are injected automatically by `src/components/wallet/WalletConnect.tsx` based on
the selected blockchain. Do not rename them.

See `docs/WALLET-CONNECTORS.md` for the full integration contract.