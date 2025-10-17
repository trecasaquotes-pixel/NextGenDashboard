import { AlertCircle, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LockStatusBannerProps {
  isLockedByOthers: boolean;
  lockedByName?: string;
}

export function LockStatusBanner({ isLockedByOthers, lockedByName }: LockStatusBannerProps) {
  if (!isLockedByOthers) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4" data-testid="alert-locked-by-others">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          <span data-testid="text-locked-by-message">
            This quotation is currently being edited by <strong>{lockedByName || 'another user'}</strong>. 
            Your changes may be overwritten.
          </span>
        </div>
      </AlertDescription>
    </Alert>
  );
}
