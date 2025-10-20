"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function SettingsPage() {
  const [holsterEnabled, setHolsterEnabled] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("holster_enabled");
      setHolsterEnabled(v === "true");
    } catch {}
  }, []);

  const enableHolster = () => {
    const url = process.env.NEXT_PUBLIC_HOLSTER_AUTH_URL;
    if (url && url.length > 0) {
      // Redirect to Holster auth to connect and encrypt bank details
      window.location.href = url;
      return;
    }
    toast("Holster auth URL not configured", {
      description:
        "Set NEXT_PUBLIC_HOLSTER_AUTH_URL in your environment to enable Holster auth.",
    });
    try {
      localStorage.setItem("holster_enabled", "true");
      setHolsterEnabled(true);
    } catch {}
  };

  const disableHolster = () => {
    try {
      localStorage.removeItem("holster_enabled");
      setHolsterEnabled(false);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#f3f1f7] py-10">
      <div className="container mx-auto px-4">
        <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Bank Details</CardTitle>
              <CardDescription>
                Enable Holster auth to store encrypted bank details.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {holsterEnabled
                    ? "Holster is enabled. Your bank details will be stored encrypted."
                    : "Holster is disabled. Enable it to securely store bank details."}
                </p>
              </div>
              <div className="flex gap-2">
                {!holsterEnabled ? (
                  <Button onClick={enableHolster}>Enable Holster</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={disableHolster}>
                      Disable
                    </Button>
                    <Button
                      onClick={() => {
                        const url = process.env.NEXT_PUBLIC_HOLSTER_DASH_URL || process.env.NEXT_PUBLIC_HOLSTER_AUTH_URL;
                        if (url) window.open(url, "_blank");
                        else
                          toast("No Holster dashboard configured", {
                            description:
                              "Set NEXT_PUBLIC_HOLSTER_DASH_URL (or AUTH URL) to manage Holster.",
                          });
                      }}
                    >
                      Manage
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

