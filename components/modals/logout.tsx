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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LogoutModal = ({ open, onOpenChange }: Props) => {
  // Router
  const router = useRouter();

  // Store
  const { setUser } = useAuthStore();

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

  //   Store
  const { user } = useAuthStore();

  // Handlers
  const handleLogout = () => {
    const refreshToken = localStorage.getItem(LOCAL_KEYS.REFRESH_TOKEN);
    logoutUser({ refreshToken: refreshToken! });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle>Leaving Squircle?</DialogTitle>
          <DialogDescription>
            You’ll be logged out, but everything will be right where you left it
            when you come back.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>

          <Button
            variant="destructive"
            loading={isLoggingUserOut}
            onClick={handleLogout}
            disabled={!user}
          >
            Logout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutModal;
