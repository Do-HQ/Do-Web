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
import useAuth from "@/hooks/useAuth";
import { ArrowRight } from "lucide-react";

interface Props {
  mode?: "signup" | "login";
}

const Auth = ({ mode }: Props) => {
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
    onSuccess(data, variables) {
      console.log(data, "Check data");
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
      </form>
    </>
  );
};

export default Auth;
