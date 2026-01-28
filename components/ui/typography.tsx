import { cn } from "@/lib/utils";

export function H1({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { children: string }) {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-center md:text-2xl text-xl font-extrabold tracking-tight text-balance",
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

export function H2({
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { children: string }) {
  return (
    <h2
      className="scroll-m-20 border-b pb-2 text-lg font-semibold tracking-tight first:mt-0"
      {...props}
    >
      {children}
    </h2>
  );
}

export function H3() {
  return (
    <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
      The Joke Tax
    </h3>
  );
}

export function H4() {
  return (
    <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
      People stopped telling jokes
    </h4>
  );
}

export function P({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & { children: string }) {
  return (
    <p className={cn(className, "leading-7 text-sm")} {...props}>
      {children}
    </p>
  );
}

export function Blockquote() {
  return (
    <blockquote className="mt-6 border-l-2 pl-6 italic">
      &quot;After all,&quot; he said, &quot;everyone enjoys a good joke, so
      it&apos;s only fair that they should pay for the privilege.&quot;
    </blockquote>
  );
}
