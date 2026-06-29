import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqs } from "@/lib/paycrivo-data";

export function FAQ() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">Frequently asked questions</h2>
        <p className="mt-3 text-muted-foreground">Everything you need to know before your first purchase.</p>
      </div>
      <Accordion type="single" collapsible className="mt-10 space-y-3">
        {faqs.map((f, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="rounded-2xl border border-border bg-card px-5 shadow-sm transition-colors data-[state=open]:border-primary/40"
          >
            <AccordionTrigger className="py-5 text-left text-base font-bold text-foreground hover:no-underline">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="pb-5 text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}