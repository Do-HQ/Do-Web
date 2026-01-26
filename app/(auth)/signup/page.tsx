import SignUpContainer from "@/components/containers/SignUpContainer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create your Squircle account",
  description: "Sign up to start collaborating in your agentic workspace",
}

const SignUpPage = () => {
  return <SignUpContainer />
}

export default SignUpPage
