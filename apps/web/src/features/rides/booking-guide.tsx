import { CircleDollarSignIcon, ListChecksIcon, ShieldCheckIcon, XCircleIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STEPS = [
  "Enter a pickup and dropoff location.",
  "Get an instant fare estimate for Economy and Comfort.",
  "Pick a category and confirm your request.",
  "A nearby driver accepts — you'll see them here once they do.",
];

const RULES = [
  {
    icon: CircleDollarSignIcon,
    text: "Fares are based on distance and estimated time, and shown before you confirm.",
  },
  {
    icon: ListChecksIcon,
    text: "You can only have one active ride at a time.",
  },
  {
    icon: XCircleIcon,
    text: "You can cancel any time before the ride is completed.",
  },
  {
    icon: ShieldCheckIcon,
    text: "Acceptance isn't instant — your request is visible to nearby drivers until one accepts.",
  },
];

export function BookingGuide() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>How booking works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-3 text-sm">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {index + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Good to know</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3 text-sm">
            {RULES.map((rule) => (
              <li key={rule.text} className="flex gap-3">
                <rule.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{rule.text}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
