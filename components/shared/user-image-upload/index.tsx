import { Button } from "@/components/ui/button";
import useFile from "@/hooks/use-file";
import UserSVG from "@/public/svg/User";
import useAuthStore from "@/stores/auth";
import { CustomFile } from "@/types/file";
import { Loader, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { Dispatch, SetStateAction, useEffect } from "react";
import { toast } from "sonner";

interface Props {
  image: CustomFile | null;
  setImage: Dispatch<SetStateAction<CustomFile | null>>;
  value?: string;
  onChange: (url: string | null) => void;
}

const UserImageUpload = ({ image, setImage, value, onChange }: Props) => {
  //   Store
  const { user } = useAuthStore();

  // Hooks
  const { useUploadAsset, useDeleteAsset } = useFile();

  const { isPending: uploadProfileImageIsLoading, mutate: uploadProfileImage } =
    useUploadAsset({
      onSuccess: (data) => {
        console.log(data);
        setImage(data?.data?.asset);
        onChange(data?.data?.asset?._id);
      },
    });

  const { isPending: deleteProfileImageIsLoading, mutate: deletProfileImage } =
    useDeleteAsset({
      onSuccess: (data) => {
        console.log(data);
        setImage(null);
        onChange(null);
        toast.success(data?.data?.message, {
          description: data?.data?.description,
        });
      },
    });

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) {
      return;
    }
    handleUploadProfileImage(e?.target?.files?.[0]);
  };

  const handleDeleteImage = () => {
    if (!image) {
      return;
    }
    deletProfileImage(image?._id);
  };

  // Handlers
  const handleUploadProfileImage = (file: File) => {
    const fd = new FormData();
    fd.append("file", file as File);
    fd.append("folder", "profile");
    fd.append("ownerId", String(user?._id));

    uploadProfileImage(fd);
  };

  //   Utils
  const loading = deleteProfileImageIsLoading || uploadProfileImageIsLoading;

  //   Effects
  useEffect(() => {
    if (user?.profilePhoto) {
      setImage(user.profilePhoto);
    }
  }, [user?.profilePhoto]);

  return (
    <div className="flex flex-col gap-2">
      <label className="relative w-18 h-18 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-border flex items-center justify-center group">
        {image ? (
          <Image
            src={image?.url}
            alt="Profile preview"
            className="object-cover w-full h-full transition-transform duration-200 group-hover:scale-105"
            width={80}
            height={80}
          />
        ) : (
          <UserSVG
            className="w-10 h-10 text-muted-foreground transition-transform duration-200 group-hover:scale-110"
            fill="currentColor"
          />
        )}

        <div className="absolute inset-0 bg-black/20  transition-opacity rounded-full flex items-center justify-center">
          <span className="text-xs text-white font-medium">
            {loading ? (
              <Loader className="animate-spin opacity-50" size={16} />
            ) : (
              <Plus size={20} className="group-hover:opacity-50 opacity-0" />
            )}
          </span>
        </div>

        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUploadImage}
        />
      </label>

      {image && (
        <Button
          size="sm"
          variant="outline"
          className="max-w-35 text-destructive"
          loading={deleteProfileImageIsLoading}
          onClick={handleDeleteImage}
        >
          <Trash2 />
          Delete image
        </Button>
      )}
    </div>
  );
};

export default UserImageUpload;
