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
          <h1 className="text-lg lg:text-xl font-medium text-foreground">
            Your Agentic workspace.
          </h1>
          <p className="text-base lg:text-lg text-muted-foreground opacity-90">
            Create your Squircle account
          </p>
        </div>

        <div className="space-y-6 my-6 lg:my-8">
          <form className="space-y-3">
            <Label htmlFor="email" className="text-sm">
              Work email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use your organization email to collaborate easily with teammates
            </p>
          </form>

          <Button className="w-full">
            Continue with email
          </Button>
        </div>
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