import { Button } from "@/components/ui/button";

interface Props {
  onBack: () => void;
}

export default function TicketCancelled({ onBack }: Props) {
  return (
    <div className="px-5 py-12 text-center space-y-3">
      <div className="w-[56px] h-[56px] rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
        <span className="text-destructive text-xl">&#x2715;</span>
      </div>
      <h2 className="text-[20px] font-bold text-foreground">Ticket annule</h2>
      <Button variant="outline" onClick={onBack} className="mt-2">Retour</Button>
    </div>
  );
}
