import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface QuoteStatusBadgeProps {
    status: string;
}

export function QuoteStatusBadge({ status }: QuoteStatusBadgeProps) {
    const t = useTranslations("quotes.status");

    const getVariant = (status: string) => {
        switch (status) {
            case "accepted":
            case "converted":
                return "default"; // Using "default" for success states
            case "sent":
                return "outline"; // Using "outline" for info states
            case "rejected":
            case "expired":
                return "destructive";
            case "draft":
            case "pending":
            default:
                return "secondary";
        }
    };

    // Map internal status to translation key
    const getLabelKey = (status: string) => {
        // Ensure we have a valid key, fallback to status itself if not found (though types should prevent this)
        return status as any;
    };

    return (
        <Badge variant={getVariant(status)} className="capitalize">
            {t(getLabelKey(status))}
        </Badge>
    );
}
