import { Input } from "../shared/input";
import useAuthStore from "@/stores/auth";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/utils/constants";
import Link from "next/link";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthData } from "@/types/auth";
import { authSchema } from "@/lib/schemas/auth";
import { H1, P } from "../ui/typography";
import useAuth from "@/hooks/use-auth";
import { ArrowRight, ChevronDown } from "lucide-react";
import config from "@/config";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { FaGoogle } from "react-icons/fa";

interface Props {
  mode?: "signup" | "login";
}

const Auth = ({ mode }: Props) => {
  const [isGoogleRedirecting, setIsGoogleRedirecting] = useState(false);
  const [googleOptionsOpen, setGoogleOptionsOpen] = useState(true);
  const hasShownGoogleErrorRef = useRef(false);
  const searchParams = useSearchParams();

  // Validation
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<AuthData>({
    resolver: zodResolver(authSchema),
    mode: "onChange",
  });

  // Store
  const { setUser } = useAuthStore();

  // Hooks
  const { useOtp } = useAuth();
  const { isPending, mutate } = useOtp({
    onSuccess(_, variables) {
      setUser({ email: variables?.email });
      toast.success(`An OTP has been sent to ${variables?.email}`, {
        description: "Please check your inbox or spam for our email",
      });
      router.push(`${ROUTES.VERIFY_OTP}?intent=${mode}`);
    },
  });

  // Router
  const router = useRouter();

  const handleContinue = async (data: AuthData) => {
    mutate({
      email: data?.email,
      intent: mode!,
    });
  };

  const handleGoogleContinue = () => {
    const baseApiUrl = String(config.BASE_API_URL || "")
      .trim()
      .replace(/\/+$/, "");

    if (!baseApiUrl) {
      toast.error("Google sign-in is not configured yet", {
        description:
          "Set NEXT_PUBLIC_API_BASE_URL and backend Google OAuth envs.",
      });
      return;
    }

    setIsGoogleRedirecting(true);
    const intent = mode === "signup" ? "signup" : "login";
    window.location.assign(
      `${baseApiUrl}/auth/google/start?intent=${encodeURIComponent(intent)}`,
    );
  };

  useEffect(() => {
    const googleError = String(searchParams.get("googleError") || "").trim();

    if (!googleError || hasShownGoogleErrorRef.current) {
      return;
    }

    hasShownGoogleErrorRef.current = true;
    toast.error("Google sign-in failed", {
      description: googleError,
    });
  }, [searchParams]);

  return (
    <>
      <div className="text-center space-y-1">
        <H1 className="font-semibold md:text-2xl text-foreground">
          {mode === "login"
            ? "Work, without the overhead."
            : "Start with clarity."}
        </H1>
        <P className="text-muted-foreground font-medium">
          {mode === "signup"
            ? "Straight to the value."
            : "Good to see you again!"}
        </P>
      </div>

      <form className="space-y-6 my-6 " onSubmit={handleSubmit(handleContinue)}>
        <Input
          type="email"
          label="Email Address"
          placeholder="Enter your email address..."
          autoComplete="email"
          tip="Use your organization email to collaborate easily with teammates"
          autoFocus
          {...register("email")}
          error={errors.email?.message}
        />

        <div>
          <Button
            className="w-full"
            disabled={isPending || !isValid}
            loading={isPending}
          >
            Continue with email
            <ArrowRight size={14} />
          </Button>

          <div className="text-center mt-2">
            <p className="text-xs text-muted-foreground">
              {mode === "signup"
                ? "Already have an account?"
                : "Don't have an account?"}{" "}
              <Link
                href={mode === "signup" ? ROUTES.SIGN_IN : ROUTES.SIGN_UP}
                className="underline hover:text-foreground"
              >
                {mode === "signup" ? "Log in" : "Sign up"}
              </Link>
            </p>
          </div>
        </div>

        <Collapsible
          open={googleOptionsOpen}
          onOpenChange={setGoogleOptionsOpen}
          className="space-y-2"
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-1.5 text-[11px] transition-colors"
            >
              Other sign-in options
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${
                  googleOptionsOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              loading={isGoogleRedirecting}
              onClick={handleGoogleContinue}
            >
              <FaGoogle size={16} />
              {mode === "signup"
                ? "Sign up with Google"
                : "Sign in with Google"}
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </form>
    </>
  );
};

export default Auth;
