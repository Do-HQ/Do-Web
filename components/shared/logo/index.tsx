import Image from "next/image";
import Link from "next/link";

interface Props {
  isFull?: boolean;
}

const Logo = ({ isFull }: Props) => {
  return (
    <Link href="/">
      <Image
        src={
          isFull
            ? "https://res.cloudinary.com/dgiropjpp/image/upload/v1769595973/Logo_maker_project-1_kh0vdk.png"
            : "https://res.cloudinary.com/dgiropjpp/image/upload/v1769577491/Logo_maker_project-2_jz4e09.png"
        }
        alt="Squircle Logo"
        width={isFull ? 150 : 60}
        height={isFull ? 70 : 60}
        className={
          isFull ? "md:w-37.5 md:h-17.5 w-30 h-15" : "md:w-16 md:h-16 w-10 h-10"
        }
      />
    </Link>
  );
};

export default Logo;
