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
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border/35 bg-muted/20 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-destructive/35 bg-destructive/12 text-destructive ring-1 ring-destructive/20">
              <LogOut className="size-4" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-[14px]">Log out of Squircle?</DialogTitle>
              <DialogDescription className="text-[12px]">
                You can sign back in anytime. Your workspace data will remain
                unchanged.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 px-4 py-3">
          <div className="bg-background/80 flex items-center gap-2 rounded-md border border-border/35 px-2.5 py-2">
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

          <div className="text-muted-foreground rounded-md border border-destructive/30 bg-destructive/8 px-2.5 py-2 text-[11.5px]">
            You will stop receiving live updates until you sign in again.
          </div>
        </div>

        <DialogFooter className="border-t border-border/35 bg-background/70 px-4 py-3">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>

          <Button
            variant="destructive"
            loading={isLoggingUserOut}
            onClick={handleLogout}
          >
            <LogOut className="size-3.5" />
            Logout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutModal;
