import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import useUser from "@/hooks/use-user";
import { toast } from "sonner";
import { LOCAL_KEYS, ROUTES } from "@/utils/constants";
import useAuthStore from "@/stores/auth";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LogoutModal = ({ open, onOpenChange }: Props) => {
  // Router
  const router = useRouter();

  // Store
  const { setUser, user } = useAuthStore();

  const userName = `${String(user?.firstName || "").trim()} ${String(
    user?.lastName || "",
  )
    .trim()}`
    .trim();
  const userEmail = String(user?.email || "").trim();
  const userAvatarUrl = String(user?.profilePhoto?.url || "").trim();
  const userInitials = (userName || userEmail || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  // Handlers
  const logout = () => {
    localStorage.removeItem(LOCAL_KEYS.TOKEN);
    localStorage.removeItem(LOCAL_KEYS.REFRESH_TOKEN);
    setUser(null);
    router.push(ROUTES.SIGN_IN);
  };

  // Hooks
  const { useLogout } = useUser();
  const { isPending: isLoggingUserOut, mutate: logoutUser } = useLogout({
    onSuccess(data) {
      toast.success(data?.data?.message, {
        description: data?.data?.description,
      });

      logout();
    },
  });

  // Handlers
  const handleLogout = () => {
    const refreshToken = localStorage.getItem(LOCAL_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      logout();
      return;
    }

    logoutUser({ refreshToken });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-border/50 p-0 sm:max-w-[26rem]">
        <DialogHeader className="px-5 pt-5 pb-3">
          <div className="flex items-start gap-3">
            <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/50 text-destructive">
              <LogOut className="size-3.5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-[14px]">Log out of Squircle?</DialogTitle>
              <DialogDescription className="text-[12px] leading-relaxed">
                You will be signed out on this device. Your workspace data stays
                intact.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2.5 border-b border-border/40 px-5 pb-4">
          <div className="bg-muted/25 flex items-center gap-2 rounded-md border border-border/45 px-2.5 py-2">
            <Avatar size="sm">
              {userAvatarUrl ? (
                <AvatarImage src={userAvatarUrl} alt={userName || userEmail} />
              ) : null}
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-medium">
                {userName || "My account"}
              </p>
              <p className="text-muted-foreground truncate text-[11px]">
                {userEmail || "No email"}
              </p>
            </div>
          </div>

          <p className="text-muted-foreground px-0.5 text-[11.5px]">
            You can sign back in anytime to resume notifications and live updates.
          </p>
        </div>

        <DialogFooter className="bg-background/95 px-5 py-4 sm:justify-end">
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </DialogClose>

          <Button
            variant="destructive"
            size="sm"
            loading={isLoggingUserOut}
            onClick={handleLogout}
          >
            <LogOut className="size-3.5" />
            Sign out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutModal;
