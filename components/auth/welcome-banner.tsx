import { Card, CardContent } from "@/components/ui/card";

type Props = {
  show: boolean;
};

const COPY =
  "Welcome back! We've successfully imported your scores from the 2025 season.";

export function WelcomeBanner({ show }: Props) {
  if (!show) return null;
  return (
    <Card className="mb-4 border-primary/30 bg-primary/5">
      <CardContent className="pt-6">
        <p className="text-center text-sm font-medium text-foreground">{COPY}</p>
      </CardContent>
    </Card>
  );
}
