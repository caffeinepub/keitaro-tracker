import { AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createActorWithConfig } from "../config";

interface ClickHandlerPageProps {
  campaignKey: string;
}

export default function ClickHandlerPage({
  campaignKey,
}: ClickHandlerPageProps) {
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [hasError, setHasError] = useState(false);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    (async () => {
      try {
        const actor = await createActorWithConfig();
        const result = await actor.processClick(
          campaignKey,
          "",
          document.referrer || "",
          window.location.href,
        );
        window.location.replace(result.offerUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
        setHasError(true);
      }
    })();
  }, [campaignKey]); // campaignKey is stable for the lifetime of this page

  // While pending — render nothing visible to avoid flash
  if (!hasError) {
    return <div style={{ display: "none" }} />;
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
