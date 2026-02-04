import { Loader } from "lucide-react";

const LoaderComponent = () => {
  return (
    <div className="flex items-center justify-center py-4 animate-spin w-full ">
      <Loader size={16} />
    </div>
  );
};

export default LoaderComponent;
