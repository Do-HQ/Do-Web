"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Input } from "@/components/shared/input"
import VerificationCode from "./VerificationCode"

type AuthMode = "signup" | "login"

const AuthFlow = ({ mode }: { mode: AuthMode }) => {
  const [step, setStep] = React.useState<"email" | "verify">("email")
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleContinue = async () => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)
    setStep("verify")
  }

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col flex-1 justify-center space-y-6">
        <div className="flex justify-center">
          <div className="text-2xl">🧡</div>
        </div>

        {step === "email" && (
          <>
            <div className="text-center space-y-1">
              <h1 className="text-lg font-semibold text-foreground">
                Your Agentic workspace.
              </h1>
              <h2 className="text-lg font-semibold text-muted-foreground opacity-70">
                {mode === "signup"
                  ? "Create your Squircle account"
                  : "Log in to your Squircle account"}
              </h2>
            </div>

            <form
              className="space-y-6 my-6"
              onSubmit={(e) => {
                e.preventDefault()
                handleContinue()
              }}
            >
              <Input
                // id="email"
                type="email"
                label="Work email"
                placeholder="Enter your email address..."
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                tip="Use your organization email to collaborate easily with teammates"
              />

              <div>
                <Button className="w-full" disabled={loading}>
                  {loading ? "Sending code..." : "Continue with email"}
                </Button>

                <div className="text-center mt-2">
                  <p className="text-xs text-muted-foreground">
                    {mode === "signup"
                      ? "Already have an account?"
                      : "Don't have an account?"}{" "}
                    <Link
                      href={mode === "signup" ? "/login" : "/signup"}
                      className="underline hover:text-foreground"
                    >
                      {mode === "signup" ? "Log in" : "Sign up"}
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </>
        )}

        {step === "verify" && (
          <VerificationCode
            email={email}
            onBack={() => setStep("email")}
          />
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center mb-6">
        By continuing, you agree to the{" "}
        <Link href="#" className="underline hover:text-foreground">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="#" className="underline hover:text-foreground">
          Privacy Policy
        </Link>.
      </p>
    </section>
  )
}

export default AuthFlow