"use client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CONTRACTS_DISABLED, DISABLE_NOTE } from "@/lib/appConfig";

export default function MaintenanceBanner() {
  if (!CONTRACTS_DISABLED) return null;
  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="container mx-auto px-4 py-3">
        <Alert>
          <AlertTitle>Notice</AlertTitle>
          <AlertDescription>{DISABLE_NOTE}</AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
