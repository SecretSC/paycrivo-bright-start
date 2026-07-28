# PayCrivo universal wallet runtime

Place the universal PayCrivo wallet runtime here:

```
public/assets/shift-runtime-sys.js
```

It is served at `/assets/shift-runtime-sys.js` and is the single script that
powers Connect Wallet for every asset and every network. The active path is
configured from Admin → Settings → Wallet Runtime and can be changed without
editing source code (only paths under `/assets/` ending in `.js` / `.mjs` are
accepted).

The optional PHP dependencies (`boot_*.php`, `secure.php`) are installed
manually on the hosting server; they are not managed by the app.
