import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const steps = [
  {
    n: "01",
    title: "Enter the amount you want to spend",
    body: "Choose your currency and the crypto you want. PayCrivo instantly shows your live rate and every fee — no surprises at checkout.",
  },
  {
    n: "02",
    title: "Verify your identity once",
    body: "Complete a fast, one-time verification with a photo ID and selfie. Most customers are approved in under two minutes.",
  },
  {
    n: "03",
    title: "Pay with card or your preferred method",
    body: "Use a credit/debit card, Apple Pay, Google Pay, SEPA, or bank wire. Payments are protected with strong encryption.",
  },
  {
    n: "04",
    title: "Receive crypto in your own wallet",
    body: "Your crypto is delivered directly to the wallet you choose — usually within minutes of approval.",
  },
];

export function HowToBuy() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">How to buy crypto</h2>
        <p className="mt-3 text-muted-foreground">Four simple steps from cash to crypto.</p>
      </div>
      <Accordion type="single" collapsible defaultValue="item-0" className="mt-10 space-y-3">
        {steps.map((s, i) => (
          <AccordionItem
            key={s.n}
            value={`item-${i}`}
            className="rounded-2xl border border-border bg-card px-5 shadow-sm transition-colors data-[state=open]:border-primary/40"
          >
            <AccordionTrigger className="py-5 hover:no-underline">
              <span className="flex items-center gap-4 text-left">
                <span className="text-gradient font-display text-lg font-extrabold">{s.n}</span>
                <span className="text-base font-bold text-foreground">{s.title}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-5 pl-12 text-muted-foreground">{s.body}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}