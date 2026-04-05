import { Users, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface CommunityNoticeProps {
  activityTitle: string;
}

const CommunityNotice = ({ activityTitle }: CommunityNoticeProps) => {
  const isMobile = useIsMobile();

  const mailtoHref = `mailto:kontakt@familyfun.pl?subject=Poprawka: ${encodeURIComponent(activityTitle)}`;

  return (
    <div className="bg-accent/50 rounded-xl p-4 md:p-5 border border-border">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-accent-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground mb-1">Tworzymy to razem</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Informacje o atrakcjach zbieramy z publicznie dostępnych źródeł, takich jak Google Maps.
            Nie odwiedziliśmy każdego miejsca osobiście — jeśli zauważysz nieaktualny cennik, złe
            godziny otwarcia lub brakujące informacje, daj nam znać. Każde zgłoszenie pomaga innym
            rodzicom lepiej zaplanować rodzinny dzień.
          </p>
          <Button
            variant="outline"
            size={isMobile ? "lg" : "default"}
            className={`mt-2 gap-2 ${isMobile ? "w-full" : ""}`}
            asChild
          >
            <a href={mailtoHref}>
              <MessageSquarePlus className="w-4 h-4" />
              Zgłoś poprawkę
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommunityNotice;
