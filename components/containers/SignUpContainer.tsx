import React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import Link from "next/link"

const SignUpContainer = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col flex-1 justify-center space-y-6">
        <div className="flex justify-center">
          <div className="text-2xl">🧡</div>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-base lg:text-lg font-semibold text-foreground">
            Your Agentic workspace.
          </h1>
          <h2 className="text-base lg:text-lg font-semibold text-muted-foreground opacity-70">
            Create your Squircle account
          </h2>
        </div>

        <form className="space-y-6 my-6 lg:my-8">
          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-xs">
              Work email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email address..."
            />
            <p className="text-xs text-muted-foreground">
              Use an organization email to easily collaborate with teammates
            </p>
          </div>

          <div>
            <Button className="w-full">
              Continue with email
            </Button>

            <div className="text-center mt-2">
              <p className="text-xs text-muted-foreground">Already have an account? {" "}
                <Link
                  href="/login"
                  className=" underline hover:text-foreground"
                >
                  Log in
                </Link></p>
            </div>
          </div>

        </form>
      </div>

      <p className="text-xs text-muted-foreground text-center mb-6">
        By continuing, you agree to the{" "}
        <Link href={"#"} className="underline cursor-pointer hover:text-foreground">Terms of Service</Link>{" "}
        and{" "}
        <Link href={"#"} className="underline cursor-pointer hover:text-foreground">Privacy Policy</Link>.
      </p>
    </section>
  )
}

export default SignUpContainer