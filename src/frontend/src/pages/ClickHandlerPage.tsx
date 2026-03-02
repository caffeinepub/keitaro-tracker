import { AlertTriangle, Loader2, MousePointerClick } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAdminActor as useActor } from "../hooks/useAdminActor";

interface ClickHandlerPageProps {
  campaignKey: string;
}

type ClickState = "loading" | "redirecting" | "error";

export default function ClickHandlerPage({
  campaignKey,
}: ClickHandlerPageProps) {
  const { actor, isFetching } = useActor();
  const [state, setState] = useState<ClickState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [offerUrl, setOfferUrl] = useState<string>("");
  const processed = useRef(false);

  useEffect(() => {
    if (isFetching || !actor || processed.current) return;
    processed.current = true;

    const run = async () => {
      try {
        const result = await actor.processClick(
          campaignKey,
          "",
          document.referrer || "",
          window.location.href,
        );
        setOfferUrl(result.offerUrl);
        setState("redirecting");
        // Redirect after brief delay so user sees feedback
        setTimeout(() => {
          window.location.href = result.offerUrl;
        }, 300);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
        setState("error");
      }
    };

    run();
  }, [actor, isFetching, campaignKey]);

  if (state === "loading" || state === "redirecting") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            {state === "redirecting" ? (
              <MousePointerClick className="w-6 h-6 text-primary" />
            ) : (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            )}
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">
              {state === "redirecting"
                ? "Redirecting..."
                : "Processing click..."}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {state === "redirecting"
                ? `You will be redirected to ${offerUrl}`
                : "Please wait a moment"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center"
      data-ocid="click.error_state"
    >
      <div className="flex flex-col items-center gap-4 text-center px-4 max-w-md">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            Campaign not found
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {errorMessage.includes("no active stream")
              ? "This campaign has no active streams configured. Please contact the campaign owner."
              : errorMessage.includes("not found") ||
                  errorMessage.includes("NotFound")
                ? `Campaign "${campaignKey}" does not exist or has been removed.`
                : "This tracking link could not be processed. It may be expired or misconfigured."}
          </p>
          {errorMessage && (
            <p className="text-xs text-muted-foreground/60 mt-2 font-mono bg-muted px-2 py-1 rounded">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
