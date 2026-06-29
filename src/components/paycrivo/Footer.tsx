import { Logo } from "./Logo";

const columns = [
  { title: "Product", links: ["Buy Crypto", "Swap Crypto", "Prices", "Supported Coins", "Fees"] },
  { title: "Company", links: ["About", "Careers", "Newsroom", "Security", "Contact"] },
  { title: "Resources", links: ["Learn", "Help Center", "API Docs", "Status", "Blog"] },
  { title: "Legal", links: ["Terms", "Privacy", "Cookies", "Licenses", "AML Policy"] },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground">
              The simple, transparent way to buy and swap crypto. Fast checkout, fair fees, your
              own wallet.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Secure account access", "Email verification", "Transparent fees", "Clear order tracking"].map((b) => (
                <span
                  key={b}
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-bold text-foreground">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} PayCrivo. All rights reserved.</p>
          <p className="max-w-md text-center text-xs sm:text-right">
            Crypto assets are volatile. Buy only what you can afford.
          </p>
        </div>
      </div>
    </footer>
  );
}