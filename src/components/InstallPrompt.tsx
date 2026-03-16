import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Smartphone, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if on iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Check if already installed (standalone)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone;
    setIsStandalone(standalone);

    // Initial check for non-standalone mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Only show if mobile and not already installed
    if (isMobile && !standalone) {
      // Show after a small delay
      const timer = setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-prompt-dismissed');
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-5">
      <Card className="shadow-2xl border-primary/20 bg-background/95 backdrop-blur-sm">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">Install Sheizen App</h4>
            <p className="text-xs text-muted-foreground line-clamp-2">
              Install our app on your home screen for the best experience and real-time notifications.
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Button size="sm" className="h-8" onClick={dismissPrompt}>
              <Download className="h-3 w-3 mr-2" />
              {isIOS ? "How to Install" : "Install Now"}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 absolute -top-2 -right-2 rounded-full bg-background shadow-md border" onClick={dismissPrompt}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
        {isIOS && (
          <div className="px-4 pb-4 pt-0 text-[10px] text-muted-foreground flex items-center gap-1 border-t mt-2 pt-2">
             Tap the <span className="p-1 px-1.5 bg-muted rounded border"><Download className="h-2 w-2 inline" /> Share</span> icon then <strong>"Add to Home Screen"</strong>
          </div>
        )}
      </Card>
    </div>
  );
}
